import { useEffect, useMemo, useState } from 'react';
import { canWrite as adapterCanWrite } from '../adapters/DataAdapter';
import {
  useAdapterRevision,
  useDataAdapter,
} from '../adapters/DataAdapterContext';
import type { ManualCase, Story } from '../core/types';
import { CaseList } from './CaseList';
import { CaseEditor } from './CaseEditor';
import { CaseEditorModal, type CaseEditorMode } from './CaseEditorModal';

interface FiltersState {
  story: string;
  tag: string;
  search: string;
}

interface ModalState {
  mode: CaseEditorMode;
  source?: Partial<ManualCase>;
}

export function TestCasesView() {
  const adapter = useDataAdapter();
  const revision = useAdapterRevision();
  const [stories, setStories] = useState<Story[]>([]);
  const [cases, setCases] = useState<ManualCase[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    story: '',
    tag: '',
    search: '',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adapter.listStories(), adapter.listManualCases()])
      .then(([s, c]) => {
        if (cancelled) return;
        setStories(s);
        setCases(c);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, revision]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of cases) for (const t of c.tags) set.add(t);
    return Array.from(set).sort();
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filters.story && !c.story_keys.includes(filters.story)) return false;
      if (filters.tag && !c.tags.includes(filters.tag)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hit =
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.story_keys.some((s) => s.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [cases, filters]);

  // Keep selection valid as filters change. Default to first case in list.
  useEffect(() => {
    if (filteredCases.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredCases.some((c) => c.id === selectedId)) {
      setSelectedId(filteredCases[0].id);
    }
  }, [filteredCases, selectedId]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? null,
    [cases, selectedId],
  );

  const canWrite = adapterCanWrite(adapter);

  async function handleDelete(c: ManualCase) {
    if (!adapter.deleteManualCase) return;
    if (!confirm(`Delete ${c.id} — "${c.title}"? This cannot be undone.`)) return;
    try {
      await adapter.deleteManualCase(c.id);
      // Optimistic: drop from local state so the editor pane clears immediately.
      setCases((curr) => curr.filter((x) => x.id !== c.id));
      setSelectedId(null);
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <p className="font-medium">Failed to load test cases</p>
          <p className="text-xs mt-1 font-mono">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-49px)] flex">
      {/* ── Left pane: filters + list ── */}
      <aside className="w-[360px] shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Test Cases
              <span className="ml-2 text-xs font-normal text-slate-500">
                {filteredCases.length} of {cases.length}
              </span>
            </h2>
            <button
              type="button"
              disabled={!canWrite}
              title={
                canWrite
                  ? 'Create new manual case'
                  : 'This adapter is read-only.'
              }
              onClick={() =>
                setModal({
                  mode: 'create',
                  source: {
                    story_keys: filters.story ? [filters.story] : [],
                  },
                })
              }
              className="px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + New
            </button>
          </div>

          <input
            type="search"
            placeholder="Search id, title, or story…"
            className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />

          <div className="flex gap-2">
            <select
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={filters.story}
              onChange={(e) =>
                setFilters((f) => ({ ...f, story: e.target.value }))
              }
            >
              <option value="">All stories</option>
              {stories.map((s) => (
                <option key={s.story_key} value={s.story_key}>
                  {s.story_key}
                </option>
              ))}
            </select>
            <select
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={filters.tag}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tag: e.target.value }))
              }
            >
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CaseList
            cases={filteredCases}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </aside>

      {/* ── Right pane: editor ── */}
      <section className="flex-1 bg-slate-50 overflow-hidden">
        {selectedCase ? (
          <CaseEditor
            manualCase={selectedCase}
            canWrite={canWrite}
            onEdit={() => setModal({ mode: 'edit', source: selectedCase })}
            onDuplicate={() =>
              setModal({
                mode: 'duplicate',
                source: {
                  ...selectedCase,
                  title: `${selectedCase.title} (copy)`,
                },
              })
            }
            onDelete={() => handleDelete(selectedCase)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            Select a case from the list to view its details.
          </div>
        )}
      </section>

      {modal && (
        <CaseEditorModal
          mode={modal.mode}
          source={modal.source}
          stories={stories}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            if (id) setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}
