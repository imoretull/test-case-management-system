// Shared event types for Playwright runs. Server emits these, browser consumes them.

export interface TestDescriptor {
  id: string;
  title: string;
  path: string[];
  file?: string;
  line?: number;
}

export type TestStatus =
  | 'passed'
  | 'failed'
  | 'timedOut'
  | 'skipped'
  | 'interrupted';

export type RunStatus = 'passed' | 'failed' | 'timedout' | 'interrupted';

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
      status: TestStatus;
      duration: number;
      error?: { message: string; stack: string };
      ts: number;
    }
  | {
      kind: 'runEnd';
      runId: string;
      status: RunStatus;
      duration: number;
      exitCode: number | null;
      ts: number;
    }
  | { kind: 'runError'; runId: string; message: string; ts: number };
