import type { TestState } from './useRunStore';

interface LiveTestTreeProps {
  tests: Map<string, TestState>;
}

const STATUS_PILL: Record<TestState['status'], string> = {
  pending: 'bg-slate-100 text-slate-500',
  running: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  timedOut: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-500',
  interrupted: 'bg-amber-100 text-amber-700',
};

const STATUS_ICON: Record<TestState['status'], string> = {
  pending: '·',
  running: '⏳',
  passed: '✅',
  failed: '🔴',
  timedOut: '⏱',
  skipped: '⚪',
  interrupted: '⚠',
};

function statusLabel(s: TestState['status']): string {
  if (s === 'timedOut') return 'timed out';
  return s;
}

export function LiveTestTree({ tests }: LiveTestTreeProps) {
  if (tests.size === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        Waiting for Playwright to enumerate tests…
      </div>
    );
  }

  // Group by first segment of `path` (typically a describe block name).
  const groups = new Map<string, TestState[]>();
  for (const t of tests.values()) {
    const key = t.descriptor.path[0] ?? '(root)';
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([group, tests]) => (
        <div key={group} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
            {group}
            <span className="ml-2 font-normal lowercase tracking-normal text-slate-500">
              {tests.length} test{tests.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {tests.map((t) => (
              <li
                key={t.descriptor.id}
                className="px-3 py-2 flex items-start gap-2 text-sm"
              >
                <span className="text-base leading-5 w-5 shrink-0">
                  {STATUS_ICON[t.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 truncate">
                    {t.descriptor.path.slice(1, -1).map((p, i) => (
                      <span key={i} className="text-slate-400 text-xs mr-1">
                        {p} ›
                      </span>
                    ))}
                    {t.descriptor.title}
                  </div>
                  {t.error && (
                    <pre className="mt-1 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {t.error.message}
                    </pre>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.duration !== undefined && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {(t.duration / 1000).toFixed(2)}s
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_PILL[t.status]}`}
                  >
                    {statusLabel(t.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
