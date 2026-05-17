import type { CoverageTally } from '../core/types';

interface CoveragePillProps {
  tally: CoverageTally;
}

const PILL_CLASS: Record<string, string> = {
  pass: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  fail: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  none: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  intentional_none: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const ICON: Record<string, string> = {
  pass: '✅',
  partial: '⚠',
  fail: '🔴',
  none: '🔴',
  intentional_none: '⚪',
};

export function CoveragePill({ tally }: CoveragePillProps) {
  const { total, passing, state } = tally;

  if (total === 0 && state === 'none') {
    return <span className="text-slate-400">—</span>;
  }

  if (total === 0 && state === 'intentional_none') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${PILL_CLASS.intentional_none}`}
        title="Intentionally not covered at this tier"
      >
        <span className="font-mono">0/0</span>
        <span>{ICON.intentional_none}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${PILL_CLASS[state]}`}
    >
      <span className="font-mono">
        {passing}/{total}
      </span>
      <span>{ICON[state]}</span>
    </span>
  );
}
