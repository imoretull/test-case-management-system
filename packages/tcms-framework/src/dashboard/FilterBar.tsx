export interface Filters {
  sprint: string;
  epic: string;
  gapsOnly: boolean;
  search: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  sprints: string[];
  epics: string[];
}

export function FilterBar({
  filters,
  onChange,
  sprints,
  epics,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600">Sprint</label>
        <select
          className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={filters.sprint}
          onChange={(e) =>
            onChange({ ...filters, sprint: e.target.value })
          }
        >
          <option value="">All</option>
          {sprints.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600">Epic</label>
        <select
          className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-xs"
          value={filters.epic}
          onChange={(e) =>
            onChange({ ...filters, epic: e.target.value })
          }
        >
          <option value="">All</option>
          {epics.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
          checked={filters.gapsOnly}
          onChange={(e) =>
            onChange({ ...filters, gapsOnly: e.target.checked })
          }
        />
        Gaps only
      </label>

      <div className="flex-1 min-w-[180px]">
        <input
          type="search"
          placeholder="Search story key or title…"
          className="w-full text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={filters.search}
          onChange={(e) =>
            onChange({ ...filters, search: e.target.value })
          }
        />
      </div>
    </div>
  );
}
