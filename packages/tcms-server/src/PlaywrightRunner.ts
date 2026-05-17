import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// ---------------- event types ----------------

export interface TestDescriptor {
  id: string;
  title: string;
  path: string[];
  file?: string;
  line?: number;
}

export type RunEvent =
  | { kind: 'runQueued'; runId: string; ts: number }
  | { kind: 'runStarting'; runId: string; ts: number }
  | { kind: 'runBegin'; runId: string; tests: TestDescriptor[]; ts: number }
  | {
      kind: 'testBegin';
      runId: string;
      id: string;
      title: string;
      path: string[];
      ts: number;
    }
  | {
      kind: 'testEnd';
      runId: string;
      id: string;
      title: string;
      path: string[];
      status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
      duration: number;
      error?: { message: string; stack: string };
      ts: number;
    }
  | {
      kind: 'runEnd';
      runId: string;
      status: 'passed' | 'failed' | 'timedout' | 'interrupted';
      duration: number;
      exitCode: number | null;
      ts: number;
    }
  | { kind: 'runError'; runId: string; message: string; ts: number };

export type RunListener = (e: RunEvent) => void;

// ---------------- runner ----------------

export interface RunRequest {
  /** Absolute path to the app's project root (where playwright.config lives). */
  appRoot: string;
  /** Optional spec filter — e.g. ["ui/cart.spec.ts"]. Empty = run all. */
  specs?: string[];
  /** Optional grep filter — Playwright -g. */
  grep?: string;
}

export interface ActiveRun {
  runId: string;
  startedAt: number;
  request: RunRequest;
}

const REPORTER_PATH = path.resolve(
  // src/PlaywrightRunner.ts → src/playwrightReporter.cjs
  new URL('./playwrightReporter.cjs', import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    '$1',
  ),
);

const NDJSON_PREFIX = 'TCMS|';

export class PlaywrightRunner {
  private listeners = new Set<RunListener>();
  private active: Map<string, { proc: ChildProcessWithoutNullStreams; info: ActiveRun }> = new Map();

  subscribe(listener: RunListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: RunEvent) {
    for (const l of this.listeners) l(e);
  }

  getActiveRuns(): ActiveRun[] {
    return Array.from(this.active.values()).map((a) => a.info);
  }

  startRun(req: RunRequest): string {
    const runId = randomUUID();
    this.emit({ kind: 'runQueued', runId, ts: Date.now() });

    // Build argv. We use the local Playwright install (npx playwright test)
    // so we run whatever version the app pinned.
    const args = ['playwright', 'test', `--reporter=${REPORTER_PATH}`];
    if (req.specs && req.specs.length > 0) args.push(...req.specs);
    if (req.grep) args.push('-g', req.grep);

    // On Windows, `npx` resolves to npx.cmd. shell:true handles that without
    // us having to detect it ourselves.
    const proc = spawn('npx', args, {
      cwd: req.appRoot,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    const info: ActiveRun = { runId, startedAt: Date.now(), request: req };
    this.active.set(runId, { proc, info });
    this.emit({ kind: 'runStarting', runId, ts: Date.now() });

    // Line-buffered stdout parsing. NDJSON lines are prefixed with TCMS|
    // so we can ignore other Playwright output (banners, summaries).
    let stdoutBuf = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8');
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith(NDJSON_PREFIX)) continue;
        try {
          const evt = JSON.parse(line.slice(NDJSON_PREFIX.length));
          this.relayReporterEvent(runId, evt);
        } catch (err) {
          console.error('[runner] failed to parse reporter line:', line, err);
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      // Don't stream every stderr line as a run event — too noisy. Just log.
      process.stderr.write(`[runner ${runId.slice(0, 8)}] ${chunk.toString('utf8')}`);
    });

    proc.on('error', (err) => {
      this.emit({ kind: 'runError', runId, message: err.message, ts: Date.now() });
      this.active.delete(runId);
    });

    proc.on('exit', (code) => {
      // Emit a synthetic runEnd if the reporter didn't (e.g. Playwright failed to
      // start). If it did emit one, this second is harmless dup — clients de-dupe
      // by runId+kind.
      if (this.active.has(runId)) {
        this.emit({
          kind: 'runEnd',
          runId,
          status: code === 0 ? 'passed' : 'failed',
          duration: Date.now() - info.startedAt,
          exitCode: code,
          ts: Date.now(),
        });
        this.active.delete(runId);
      }
    });

    return runId;
  }

  cancelRun(runId: string): boolean {
    const a = this.active.get(runId);
    if (!a) return false;
    a.proc.kill('SIGTERM');
    return true;
  }

  private relayReporterEvent(runId: string, evt: { kind: string; [k: string]: unknown }) {
    const ts = Date.now();
    switch (evt.kind) {
      case 'runBegin':
        this.emit({
          kind: 'runBegin',
          runId,
          tests: evt.tests as TestDescriptor[],
          ts,
        });
        break;
      case 'testBegin':
        this.emit({
          kind: 'testBegin',
          runId,
          id: evt.id as string,
          title: evt.title as string,
          path: evt.path as string[],
          ts,
        });
        break;
      case 'testEnd':
        this.emit({
          kind: 'testEnd',
          runId,
          id: evt.id as string,
          title: evt.title as string,
          path: evt.path as string[],
          status: evt.status as 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted',
          duration: evt.duration as number,
          error: evt.error as { message: string; stack: string } | undefined,
          ts,
        });
        break;
      case 'runEnd':
        this.emit({
          kind: 'runEnd',
          runId,
          status: evt.status as 'passed' | 'failed' | 'timedout' | 'interrupted',
          duration: evt.duration as number,
          exitCode: null,
          ts,
        });
        this.active.delete(runId);
        break;
    }
  }
}
