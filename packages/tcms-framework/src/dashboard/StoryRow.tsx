import type { StoryCoverage } from '../core/types';
import { CoveragePill } from './CoveragePill';
import { ExpandedStoryPanel } from './ExpandedStoryPanel';
import { JiraLink } from './shared/JiraLink';

interface StoryRowProps {
  row: StoryCoverage;
  expanded: boolean;
  onToggle: () => void;
}

export function StoryRow({ row, expanded, onToggle }: StoryRowProps) {
  const bugsClass =
    row.bugs.prod > 0 ? 'text-red-600 font-semibold' : 'text-slate-500';
  return (
    <>
      <tr
        className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${
          expanded ? 'bg-slate-50' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-2 py-2 w-8 text-slate-400 text-xs select-none">
          {expanded ? '▼' : '▶'}
        </td>
        <td className="px-2 py-2 w-[120px]">
          <JiraLink storyKey={row.story.story_key} />
        </td>
        <td className="px-2 py-2">
          <span className="text-sm text-slate-800">{row.story.title}</span>
        </td>
        <td className="px-2 py-2 w-[100px]">
          <CoveragePill tally={row.manual} />
        </td>
        <td className="px-2 py-2 w-[100px]">
          <CoveragePill tally={row.ui_auto} />
        </td>
        <td className="px-2 py-2 w-[100px]">
          <CoveragePill tally={row.api_auto} />
        </td>
        <td className={`px-2 py-2 w-[80px] text-sm ${bugsClass}`}>
          {row.bugs.total > 0 ? (
            <span>
              {row.bugs.total} {row.bugs.prod > 0 ? '🔴' : ''}
            </span>
          ) : (
            <span className="text-slate-400">0</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-2 py-0">
            <ExpandedStoryPanel row={row} />
          </td>
        </tr>
      )}
    </>
  );
}
