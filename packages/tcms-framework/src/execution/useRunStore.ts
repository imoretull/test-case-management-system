import { useEffect, useRef, useState } from 'react';
import type {
  RunEvent,
  RunStatus,
  TestDescriptor,
  TestStatus,
} from '../runner/events';
import { useDataAdapter } from '../adapters/DataAdapterContext';
import type { HttpAdapter } from '../adapters/HttpAdapter';

// Some adapters (ViteGlobAdapter) don't run tests. Capability check below
// keeps the UI rendering even when the adapter can't subscribe.
interface RunCapableAdapter {
  subscribeRunEvents(listener: (e: RunEvent) => void): () => void;
  startRun(opts?: { specs?: string[]; grep?: string }): Promise<string>;
  cancelRun(runId: string): Promise<void>;
}

function isRunCapable(a: unknown): a is RunCapableAdapter {
  const obj = a as Partial<RunCapableAdapter> | null;
  return (
    !!obj &&
    typeof obj.subscribeRunEvents === 'function' &&
    typeof obj.startRun === 'function'
  );
}

export interface TestState {
  descriptor: TestDescriptor;
  status: TestStatus | 'running' | 'pending';
  duration?: number;
  error?: { message: string; stack: string };
}

export interface RunSummary {
  runId: string;
  startedAt: number;
  endedAt?: number;
  status: 'queued' | 'running' | RunStatus | 'error';
  tests: Map<string, TestState>;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errorMessage?: string;
}

export interface StartRunOptions {
  specs?: string[];
  grep?: string;
}

export interface RunStore {
  capable: boolean;
  active: RunSummary | null;
  history: RunSummary[];
  startRun: (opts?: StartRunOptions) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  startError: Error | null;
}

const MAX_HISTORY = 10;

function makeSummary(runId: string, startedAt: number): RunSummary {
  return {
    runId,
    startedAt,
    status: 'queued',
    tests: new Map(),
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
}

function applyEvent(curr: RunSummary, evt: RunEvent): RunSummary {
  // Always work on a shallow clone so React sees a new reference.
  const next: RunSummary = {
    ...curr,
    tests: new Map(curr.tests),
  };

  switch (evt.kind) {
    case 'runStarting':
      next.status = 'running';
      break;

    case 'runBegin':
      next.total = evt.tests.length;
      for (const d of evt.tests) {
        next.tests.set(d.id, { descriptor: d, status: 'pending' });
      }
      break;

    case 'testBegin': {
      const existing = next.tests.get(evt.id);
      const descriptor: TestDescriptor =
        existing?.descriptor ?? {
          id: evt.id,
          title: evt.title,
          path: evt.path,
        };
      next.tests.set(evt.id, { descriptor, status: 'running' });
      break;
    }

    case 'testEnd': {
      const existing = next.tests.get(evt.id);
      const descriptor: TestDescriptor =
        existing?.descriptor ?? {
          id: evt.id,
          title: evt.title,
          path: evt.path,
        };
      next.tests.set(evt.id, {
        descriptor,
        status: evt.status,
        duration: evt.duration,
        error: evt.error,
      });
      if (evt.status === 'passed') next.passed++;
      else if (evt.status === 'failed' || evt.status === 'timedOut')
        next.failed++;
      else if (evt.status === 'skipped') next.skipped++;
      break;
    }

    case 'runEnd':
      next.status = evt.status;
      next.endedAt = evt.ts;
      break;

    case 'runError':
      next.status = 'error';
      next.errorMessage = evt.message;
      next.endedAt = evt.ts;
      break;
  }

  return next;
}

export function useRunStore(): RunStore {
  const adapter = useDataAdapter();
  const capable = isRunCapable(adapter);

  const [active, setActive] = useState<RunSummary | null>(null);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [startError, setStartError] = useState<Error | null>(null);
  const activeRef = useRef<RunSummary | null>(null);
  activeRef.current = active;

  useEffect(() => {
    if (!capable) return;
    const cap = adapter as unknown as RunCapableAdapter & HttpAdapter;
    const unsub = cap.subscribeRunEvents((evt) => {
      if (evt.kind === 'runQueued') {
        const fresh = makeSummary(evt.runId, evt.ts);
        setActive(fresh);
        return;
      }
      const curr = activeRef.current;
      if (!curr || curr.runId !== evt.runId) return;
      const next = applyEvent(curr, evt);
      setActive(next);
      if (
        evt.kind === 'runEnd' ||
        evt.kind === 'runError'
      ) {
        setHistory((h) => [next, ...h].slice(0, MAX_HISTORY));
      }
    });
    return unsub;
  }, [adapter, capable]);

  return {
    capable,
    active,
    history,
    startError,
    async startRun(opts?: StartRunOptions) {
      if (!capable) return;
      setStartError(null);
      try {
        const cap = adapter as unknown as RunCapableAdapter;
        await cap.startRun(opts);
      } catch (e) {
        setStartError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    async cancelRun(runId: string) {
      if (!capable) return;
      const cap = adapter as unknown as RunCapableAdapter;
      await cap.cancelRun(runId);
    },
  };
}
