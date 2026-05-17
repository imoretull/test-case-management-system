import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import chokidar from 'chokidar';
import path from 'node:path';
import type { ManualCase } from '@tcms/framework';
import { MarkdownFileAdapter } from './MarkdownFileAdapter.ts';
import { PlaywrightRunner } from './PlaywrightRunner.ts';

export interface ServerOptions {
  dataRoot: string;
  appRoot: string;
  port?: number;
}

export interface RunningServer {
  port: number;
  close: () => Promise<void>;
}

type SseClient = { id: number; res: Response };

export async function startServer(opts: ServerOptions): Promise<RunningServer> {
  const adapter = new MarkdownFileAdapter({ dataRoot: opts.dataRoot });
  const runner = new PlaywrightRunner();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // CORS for the Vite dev server (different port).
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // ---------------- SSE: data change events ----------------
  const sseClients = new Set<SseClient>();
  let nextSseId = 1;

  function broadcastChange(kind: string, payload?: unknown) {
    const msg = `data: ${JSON.stringify({ kind, payload, ts: Date.now() })}\n\n`;
    for (const c of sseClients) c.res.write(msg);
  }

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`: connected\n\n`);

    const client: SseClient = { id: nextSseId++, res };
    sseClients.add(client);
    req.on('close', () => sseClients.delete(client));
  });

  // ---------------- Reads ----------------
  app.get('/api/stories', async (req, res, next) => {
    try {
      const stories = await adapter.listStories({
        sprint: req.query.sprint as string | undefined,
        epic: req.query.epic as string | undefined,
      });
      res.json(stories);
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/bugs', async (req, res, next) => {
    try {
      res.json(await adapter.listBugs(req.query.story as string | undefined));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/automated-tests', async (req, res, next) => {
    try {
      res.json(
        await adapter.listAutomatedTests(req.query.story as string | undefined),
      );
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/manual-cases', async (req, res, next) => {
    try {
      res.json(
        await adapter.listManualCases(req.query.story as string | undefined),
      );
    } catch (e) {
      next(e);
    }
  });

  // ---------------- Writes (manual cases) ----------------
  app.post('/api/manual-cases', async (req, res, next) => {
    try {
      const created = await adapter.createManualCase(req.body as Omit<ManualCase, 'id'>);
      broadcastChange('manualCase.created', { id: created.id });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  app.patch('/api/manual-cases/:id', async (req, res, next) => {
    try {
      const updated = await adapter.updateManualCase(
        req.params.id,
        req.body as Partial<ManualCase>,
      );
      broadcastChange('manualCase.updated', { id: updated.id });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/manual-cases/:id', async (req, res, next) => {
    try {
      await adapter.deleteManualCase(req.params.id);
      broadcastChange('manualCase.deleted', { id: req.params.id });
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  });

  // ---------------- Runs ----------------
  const runClients = new Set<SseClient>();
  runner.subscribe((evt) => {
    const msg = `data: ${JSON.stringify(evt)}\n\n`;
    for (const c of runClients) c.res.write(msg);
  });

  app.get('/api/runs/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`: connected\n\n`);
    const client: SseClient = { id: nextSseId++, res };
    runClients.add(client);
    req.on('close', () => runClients.delete(client));
  });

  app.post('/api/runs', (req, res) => {
    const body = (req.body ?? {}) as { specs?: string[]; grep?: string };
    const runId = runner.startRun({
      appRoot: opts.appRoot,
      specs: body.specs,
      grep: body.grep,
    });
    res.status(202).json({ runId });
  });

  app.get('/api/runs/active', (_req, res) => {
    res.json(runner.getActiveRuns());
  });

  app.delete('/api/runs/:runId', (req, res) => {
    const ok = runner.cancelRun(req.params.runId);
    res.status(ok ? 204 : 404).end();
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      dataRoot: opts.dataRoot,
      appRoot: opts.appRoot,
    });
  });

  // ---------------- Error handler ----------------
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[tcms-server]', err);
    res.status(500).json({ error: err.message });
  });

  // ---------------- File watcher → SSE ----------------
  const watcher = chokidar.watch(
    [
      path.join(opts.dataRoot, 'manual'),
      path.join(opts.dataRoot, 'stories.json'),
      path.join(opts.dataRoot, 'bugs.json'),
      path.join(opts.dataRoot, 'automatedTests.json'),
    ],
    { ignoreInitial: true },
  );

  let debounce: NodeJS.Timeout | null = null;
  watcher.on('all', (event, filepath) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      broadcastChange('files.changed', { event, path: filepath });
      debounce = null;
    }, 100);
  });

  // ---------------- Listen ----------------
  const port = opts.port ?? 3030;
  const httpServer = app.listen(port);
  await new Promise<void>((resolve) => httpServer.once('listening', () => resolve()));
  console.log(`[tcms-server] listening on http://localhost:${port}`);
  console.log(`[tcms-server] dataRoot: ${opts.dataRoot}`);
  console.log(`[tcms-server] appRoot:  ${opts.appRoot}`);

  return {
    port,
    async close() {
      await watcher.close();
      for (const c of sseClients) c.res.end();
      for (const c of runClients) c.res.end();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}
