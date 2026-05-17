import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryCoverage } from '../core/types';
import { StoryRow } from './StoryRow';

interface MatrixTableProps {
  rows: StoryCoverage[];
}

export function MatrixTable({ rows }: MatrixTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((key: string) => {
    setExpandedKey((curr) => (curr === key ? null : key));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement.tagName,
        )
      ) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const r = rows[focusedIndex];
        if (r) {
          e.preventDefault();
          handleToggle(r.story.story_key);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, focusedIndex, handleToggle]);

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-10 text-center text-sm text-slate-500">
        No stories match the current filters.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
    >
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wide">
            <th className="px-2 py-2 w-8"></th>
            <th className="px-2 py-2 w-[120px]">Story</th>
            <th className="px-2 py-2">Title</th>
            <th className="px-2 py-2 w-[100px]">Manual</th>
            <th className="px-2 py-2 w-[100px]">UI Auto</th>
            <th className="px-2 py-2 w-[100px]">API Auto</th>
            <th className="px-2 py-2 w-[80px]">Bugs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <StoryRow
              key={row.story.story_key}
              row={row}
              expanded={expandedKey === row.story.story_key}
              onToggle={() => {
                setFocusedIndex(idx);
                handleToggle(row.story.story_key);
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
