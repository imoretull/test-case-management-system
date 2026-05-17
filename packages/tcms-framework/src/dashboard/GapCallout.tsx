import type { StoryCoverage } from '../core/types';
import { AddButton } from './AddButton';

interface GapCalloutProps {
  row: StoryCoverage;
}

export function GapCallout({ row }: GapCalloutProps) {
  const gaps: ('manual' | 'ui' | 'api')[] = [];
  if (row.manual.total === 0) gaps.push('manual');
  if (row.ui_auto.state === 'none') gaps.push('ui');
  if (row.api_auto.total === 0) gaps.push('api');

  if (gaps.length === 0) return null;

  const tierLabel = (g: 'manual' | 'ui' | 'api') =>
    g === 'manual'
      ? 'manual coverage'
      : g === 'ui'
        ? 'UI automation'
        : 'API automation';

  const message =
    gaps.length === 3
      ? '⚠ No coverage of any kind for this story'
      : `⚠ Missing ${gaps.map(tierLabel).join(' and ')}`;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="text-xs font-medium text-amber-800 mb-2">{message}</p>
      <div className="flex flex-wrap gap-2">
        {gaps.includes('manual') && (
          <AddButton storyKey={row.story.story_key} kind="manual" />
        )}
        {gaps.includes('ui') && (
          <AddButton storyKey={row.story.story_key} kind="ui" />
        )}
        {gaps.includes('api') && (
          <AddButton storyKey={row.story.story_key} kind="api" />
        )}
        <AddButton storyKey={row.story.story_key} kind="link" />
      </div>
    </div>
  );
}
