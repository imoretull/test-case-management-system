import type { AutomatedTest, ManualCase } from '../core/types';
import { ExpandedTestPanel } from './ExpandedTestPanel';

export type TestEntry =
  | { kind: 'manual'; test: ManualCase; key: string }
  | { kind: 'auto'; test: AutomatedTest; key: string };

interface TestRowProps {
  entry: TestEntry;
  expanded: boolean;
  onToggle: () => void;
}

function tierLabel(entry: TestEntry): string {
  if (entry.kind === 'manual') return 'Manual';
  return entry.test.test_type === 'ui' ? 'UI Auto' : 'API Auto';
}

function statusIcon(entry: TestEntry): string {
  const s = entry.kind === 'manual' ? entry.test.last_status : entry.test.last_status;
  const norm = String(s).toLowerCase();
  if (norm === 'pass') return '✅';
  if (norm === 'fail') return '🔴';
  if (norm === 'skip' || norm === 'blocked' || norm === 'not_run') return '⚪';
  return '⚠';
}

function statusText(entry: TestEntry): string {
  const s = entry.kind === 'manual' ? entry.test.last_status : entry.test.last_status;
  const norm = String(s).toLowerCase();
  return norm.charAt(0).toUpperCase() + norm.slice(1).replace('_', ' ');
}

function title(entry: TestEntry): string {
  return entry.kind === 'manual' ? entry.test.title : entry.test.fq_name;
}

export function TestRow({ entry, expanded, onToggle }: TestRowProps) {
  const lastRun =
    entry.kind === 'manual' ? entry.test.last_run : entry.test.last_run;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-slate-100/60 rounded px-1"
      >
        <span className="text-slate-400 text-xs w-4 inline-block">
          {expanded ? '▼' : '▶'}
        </span>
        <span
          className={`flex-1 text-sm ${
            entry.kind === 'auto' ? 'font-mono text-xs' : 'text-slate-800'
          }`}
        >
          {title(entry)}
        </span>
        <span className="text-xs text-slate-500 w-20 shrink-0">
          {tierLabel(entry)}
        </span>
        <span className="text-xs text-slate-500 w-20 shrink-0">
          {lastRun ?? '—'}
        </span>
        <span className="text-xs w-20 shrink-0">
          <span className="mr-1">{statusIcon(entry)}</span>
          {statusText(entry)}
        </span>
      </button>
      {expanded && <ExpandedTestPanel entry={entry} />}
    </div>
  );
}
