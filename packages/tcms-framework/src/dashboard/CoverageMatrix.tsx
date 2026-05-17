import { useEffect, useMemo, useState } from 'react';
import type { AutomatedTest, Bug, ManualCase, Story } from '../core/types';
import {
  computeAllCoverage,
  hasAnyGap,
  sortByWorstFirst,
  type CoverageOptions,
} from '../core/coverage';
import {
  useAdapterRevision,
  useDataAdapter,
} from '../adapters/DataAdapterContext';
import { FilterBar, type Filters } from './FilterBar';
import { MatrixTable } from './MatrixTable';
import { applyLiveOverlay, useLiveAutoStatuses } from './liveOverlay';

export interface CoverageMatrixProps {
  productName?: string;
  productKey?: string;
  coverageOptions?: CoverageOptions;
}

function readFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  return {
    sprint: params.get('sprint') ?? '',
    epic: params.get('epic') ?? '',
    gapsOnly: params.get('gaps_only') === 'true',
    search: params.get('search') ?? '',
  };
}

function writeFiltersToUrl(f: Filters) {
  const params = new URLSearchParams();
  if (f.sprint) params.set('sprint', f.sprint);
  if (f.epic) params.set('epic', f.epic);
  if (f.gapsOnly) params.set('gaps_only', 'true');
  if (f.search) params.set('search', f.search);
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

interface AdapterData {
  stories: Story[];
  manualCases: ManualCase[];
  automatedTests: AutomatedTest[];
  bugs: Bug[];
}

export function CoverageMatrix({
  productName,
  coverageOptions,
}: CoverageMatrixProps) {
  const adapter = useDataAdapter();
  const revision = useAdapterRevision();
  const liveStatuses = useLiveAutoStatuses();
  const [data, setData] = useState<AdapterData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<Filters>(() => readFiltersFromUrl());

  useEffect(() => {
    writeFiltersToUrl(filters);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adapter.listStories(),
      adapter.listManualCases(),
      adapter.listAutomatedTests(),
      adapter.listBugs(),
    ])
      .then(([stories, manualCases, automatedTests, bugs]) => {
        if (cancelled) return;
        setData({ stories, manualCases, automatedTests, bugs });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, revision]);

  const allRows = useMemo(() => {
    if (!data) return [];
    const tests = applyLiveOverlay(data.automatedTests, liveStatuses);
    return sortByWorstFirst(
      computeAllCoverage(
        data.stories,
        data.manualCases,
        tests,
        data.bugs,
        coverageOptions,
      ),
    );
  }, [data, liveStatuses, coverageOptions]);

  const sprints = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.stories.map((s) => s.sprint).filter(Boolean) as string[]),
    ).sort();
  }, [data]);

  const epics = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.stories.map((s) => s.epic).filter(Boolean) as string[]),
    ).sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (filters.sprint && row.story.sprint !== filters.sprint) return false;
      if (filters.epic && row.story.epic !== filters.epic) return false;
      if (filters.gapsOnly && !hasAnyGap(row)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hit =
          row.story.story_key.toLowerCase().includes(q) ||
          row.story.title.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [allRows, filters]);

  const totalGaps = allRows.filter((r) => hasAnyGap(r)).length;
  const totalProdBugs = allRows.reduce((acc, r) => acc + r.bugs.prod, 0);

  return (
    <div>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              Coverage Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {productName
                ? `${productName} · QA Command Center`
                : 'QA Command Center'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>
              <span className="font-mono font-medium text-slate-800">
                {allRows.length}
              </span>{' '}
              stories
            </span>
            <span>
              <span className="font-mono font-medium text-amber-700">
                {totalGaps}
              </span>{' '}
              with gaps
            </span>
            <span>
              <span className="font-mono font-medium text-red-700">
                {totalProdBugs}
              </span>{' '}
              prod bugs
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-medium">Failed to load TCMS data</p>
            <p className="text-xs mt-1 font-mono">{error.message}</p>
          </div>
        ) : !data ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              sprints={sprints}
              epics={epics}
            />
            <MatrixTable rows={filteredRows} />
            <p className="text-xs text-slate-400 text-center">
              Click a row to expand. Arrow keys navigate · Enter expands.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
