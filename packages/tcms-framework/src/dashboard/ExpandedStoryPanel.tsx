import { useState } from 'react';
import type { StoryCoverage } from '../core/types';
import { GapCallout } from './GapCallout';
import { TestRow, type TestEntry } from './TestRow';

interface ExpandedStoryPanelProps {
  row: StoryCoverage;
}

function buildEntries(row: StoryCoverage): TestEntry[] {
  const entries: TestEntry[] = [];
  for (const c of row.manual_cases) {
    entries.push({ kind: 'manual', test: c, key: c.id });
  }
  for (const t of row.ui_tests) {
    entries.push({ kind: 'auto', test: t, key: t.id });
  }
  for (const t of row.api_tests) {
    entries.push({ kind: 'auto', test: t, key: t.id });
  }
  const typeOrder = (e: TestEntry) =>
    e.kind === 'manual' ? 0 : e.test.test_type === 'ui' ? 1 : 2;
  return entries.sort((a, b) => {
    const t = typeOrder(a) - typeOrder(b);
    if (t !== 0) return t;
    const ra = (a.kind === 'manual' ? a.test.last_run : a.test.last_run) ?? '';
    const rb = (b.kind === 'manual' ? b.test.last_run : b.test.last_run) ?? '';
    return ra.localeCompare(rb);
  });
}

export function ExpandedStoryPanel({ row }: ExpandedStoryPanelProps) {
  const entries = buildEntries(row);
  const [expandedTestKey, setExpandedTestKey] = useState<string | null>(null);

  return (
    <div className="bg-slate-50 border-l-2 border-blue-300 ml-8 my-2 p-4 rounded">
      {entries.length === 0 ? (
        <div className="text-sm text-slate-600">
          <p className="font-medium">No tests linked to this story.</p>
          <p className="text-xs text-slate-500 mt-1">
            Use the buttons below to start covering it.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_5rem_5rem_5rem] text-xs font-semibold uppercase tracking-wide text-slate-500 pb-1 px-1">
            <span>Test</span>
            <span>Type</span>
            <span>Last Run</span>
            <span>Status</span>
          </div>
          <div>
            {entries.map((e) => (
              <TestRow
                key={`${e.kind}-${e.key}`}
                entry={e}
                expanded={expandedTestKey === `${e.kind}-${e.key}`}
                onToggle={() =>
                  setExpandedTestKey((curr) =>
                    curr === `${e.kind}-${e.key}` ? null : `${e.kind}-${e.key}`,
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      <GapCallout row={row} />

      {row.linked_bugs.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-600 mb-1">
            Linked bugs:
          </p>
          <ul className="space-y-1">
            {row.linked_bugs.map((b) => (
              <li
                key={b.jira_key}
                className="text-xs flex items-center gap-2 flex-wrap"
              >
                <span
                  className={
                    b.found_in === 'prod'
                      ? 'text-red-600 font-semibold'
                      : 'text-slate-500'
                  }
                >
                  {b.found_in === 'prod' ? '🔴' : '⚠'} {b.jira_key}
                </span>
                <span className="text-slate-700">{b.title}</span>
                <span className="text-slate-400">
                  ({b.severity}, {b.found_in})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
