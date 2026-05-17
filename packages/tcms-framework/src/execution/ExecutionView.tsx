import { LiveTestTree } from './LiveTestTree';
import { useRunStore, type RunSummary } from './useRunStore';

export function ExecutionView() {
  const store = useRunStore();

  if (!store.capable) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-lg font-semibold text-slate-800">Execution</h2>
        <p className="mt-2 text-sm text-slate-600">
          The current adapter doesn't support running tests. The HTTP adapter
          (used when the TCMS server is running) provides this capability.
        </p>
      </div>
    );
  }

  const isRunning =
    store.active &&
    (store.active.status === 'queued' || store.active.status === 'running');

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* ── Header / trigger ── */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Execution</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Runs use your local Playwright install via{' '}
            <span className="font-mono">npx playwright test</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && store.active && (
            <button
              type="button"
              onClick={() => store.cancelRun(store.active!.runId)}
              className="px-3 py-1.5 text-sm font-medium rounded border border-red-300 text-red-700 hover:bg-red-50"
            >
              Cancel run
            </button>
          )}
          <button
            type="button"
            disabled={!!isRunning}
            onClick={() => store.startRun()}
            className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running…' : 'Run all tests'}
          </button>
        </div>
      </header>

      {store.startError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Failed to start run: {store.startError.message}
        </div>
      )}

      {/* ── Active run ── */}
      {store.active ? (
        <ActiveRunPanel run={store.active} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          No active run. Click <strong>Run all tests</strong> to start.
        </div>
      )}

      {/* ── History ── */}
      {store.history.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Recent runs
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {store.history.map((r) => (
              <HistoryRow key={r.runId} run={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveRunPanel({ run }: { run: RunSummary }) {
  const finished =
    run.status !== 'queued' &&
    run.status !== 'running';

  return (
    <section>
      <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
        <span className="font-mono text-slate-400">
          {run.runId.slice(0, 8)}
        </span>
        <RunStatusBadge status={run.status} />
        <span>
          <span className="font-mono font-medium text-slate-800">
            {run.passed}
          </span>{' '}
          passed
          {run.failed > 0 && (
            <>
              {' · '}
              <span className="font-mono font-medium text-red-700">
                {run.failed}
              </span>{' '}
              failed
            </>
          )}
          {run.skipped > 0 && (
            <>
              {' · '}
              <span className="font-mono font-medium text-slate-500">
                {run.skipped}
              </span>{' '}
              skipped
            </>
          )}
          {run.total > 0 && (
            <>
              {' · '}
              <span className="text-slate-400">of {run.total}</span>
            </>
          )}
        </span>
        {finished && run.endedAt && (
          <span className="text-slate-400">
            {((run.endedAt - run.startedAt) / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {run.errorMessage && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {run.errorMessage}
        </div>
      )}

      <LiveTestTree tests={run.tests} />
    </section>
  );
}

function HistoryRow({ run }: { run: RunSummary }) {
  const duration =
    run.endedAt !== undefined ? (run.endedAt - run.startedAt) / 1000 : null;
  return (
    <div className="px-3 py-2 flex items-center gap-3 text-sm">
      <span className="font-mono text-xs text-slate-400 w-20">
        {run.runId.slice(0, 8)}
      </span>
      <RunStatusBadge status={run.status} />
      <span className="text-slate-700 flex-1">
        <span className="font-mono font-medium">{run.passed}</span> /{' '}
        <span className="font-mono">{run.total}</span> passed
        {run.failed > 0 && (
          <>
            {' · '}
            <span className="text-red-700 font-mono font-medium">
              {run.failed}
            </span>{' '}
            failed
          </>
        )}
      </span>
      <span className="text-xs text-slate-400 font-mono">
        {duration !== null ? `${duration.toFixed(1)}s` : '—'}
      </span>
    </div>
  );
}

const STATUS_BADGE_CLASS: Record<RunSummary['status'], string> = {
  queued: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  timedout: 'bg-red-100 text-red-700',
  interrupted: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
};

function RunStatusBadge({ status }: { status: RunSummary['status'] }) {
  return (
    <span
      className={
        'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ' +
        STATUS_BADGE_CLASS[status]
      }
    >
      {status === 'timedout' ? 'timed out' : status}
    </span>
  );
}
