import type { ManualCase } from '../core/types';

interface CaseListProps {
  cases: ManualCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_BADGE: Record<ManualCase['last_status'], string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  BLOCKED: 'bg-amber-100 text-amber-700',
  NOT_RUN: 'bg-slate-100 text-slate-600',
};

export function CaseList({ cases, selectedId, onSelect }: CaseListProps) {
  if (cases.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        No cases match these filters.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {cases.map((c) => {
        const isSelected = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={
                'w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ' +
                (isSelected ? 'bg-blue-50 hover:bg-blue-50' : '')
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500">{c.id}</span>
                <span
                  className={
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded ' +
                    STATUS_BADGE[c.last_status]
                  }
                >
                  {c.last_status}
                </span>
              </div>
              <div className="text-sm text-slate-800 mt-0.5 line-clamp-2">
                {c.title}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="font-mono">{c.story_keys.join(', ')}</span>
                {c.folder && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{c.folder}</span>
                  </>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
