import type {
  AutomatedTest,
  Bug,
  CoverageState,
  CoverageTally,
  ManualCase,
  Story,
  StoryCoverage,
} from './types';

function tally(
  total: number,
  passing: number,
  intentional = false,
): CoverageTally {
  let state: CoverageState;
  if (total === 0) state = intentional ? 'intentional_none' : 'none';
  else if (passing === total) state = 'pass';
  else if (passing === 0) state = 'fail';
  else state = 'partial';
  return { total, passing, state };
}

export interface CoverageOptions {
  uiIntentionalNone?: ReadonlySet<string>;
}

export function computeStoryCoverage(
  story: Story,
  cases: ManualCase[],
  tests: AutomatedTest[],
  bugs: Bug[],
  opts: CoverageOptions = {},
): StoryCoverage {
  const manual_cases = cases.filter((c) =>
    c.story_keys.includes(story.story_key),
  );
  const ui_tests = tests.filter(
    (t) => t.test_type === 'ui' && t.jira_keys.includes(story.story_key),
  );
  const api_tests = tests.filter(
    (t) => t.test_type === 'api' && t.jira_keys.includes(story.story_key),
  );
  const linked_bugs = bugs.filter((b) =>
    b.story_keys.includes(story.story_key),
  );

  return {
    story,
    manual: tally(
      manual_cases.length,
      manual_cases.filter((c) => c.last_status === 'PASS').length,
    ),
    ui_auto: tally(
      ui_tests.length,
      ui_tests.filter((t) => t.last_status === 'pass').length,
      opts.uiIntentionalNone?.has(story.story_key) ?? false,
    ),
    api_auto: tally(
      api_tests.length,
      api_tests.filter((t) => t.last_status === 'pass').length,
    ),
    bugs: {
      total: linked_bugs.length,
      prod: linked_bugs.filter((b) => b.found_in === 'prod').length,
    },
    manual_cases,
    ui_tests,
    api_tests,
    linked_bugs,
  };
}

export function computeAllCoverage(
  stories: Story[],
  cases: ManualCase[],
  tests: AutomatedTest[],
  bugs: Bug[],
  opts: CoverageOptions = {},
): StoryCoverage[] {
  return stories.map((s) => computeStoryCoverage(s, cases, tests, bugs, opts));
}

/**
 * Default sort: worst-first.
 *   1. zero coverage AND prod bugs
 *   2. any prod bugs (more first)
 *   3. pure gaps (zero in all three tiers)
 *   4. by story_key ascending
 */
export function sortByWorstFirst(rows: StoryCoverage[]): StoryCoverage[] {
  const isZeroCoverage = (r: StoryCoverage) =>
    r.manual.total === 0 && r.ui_auto.total === 0 && r.api_auto.total === 0;

  return [...rows].sort((a, b) => {
    const aZeroAndProd = isZeroCoverage(a) && a.bugs.prod > 0 ? 1 : 0;
    const bZeroAndProd = isZeroCoverage(b) && b.bugs.prod > 0 ? 1 : 0;
    if (aZeroAndProd !== bZeroAndProd) return bZeroAndProd - aZeroAndProd;

    if (a.bugs.prod !== b.bugs.prod) return b.bugs.prod - a.bugs.prod;

    const aPureGap = isZeroCoverage(a) ? 1 : 0;
    const bPureGap = isZeroCoverage(b) ? 1 : 0;
    if (aPureGap !== bPureGap) return bPureGap - aPureGap;

    return a.story.story_key.localeCompare(b.story.story_key);
  });
}

export function hasAnyGap(r: StoryCoverage): boolean {
  const tierIsGap = (t: CoverageTally) =>
    t.state === 'none' ||
    t.state === 'fail' ||
    t.state === 'partial';
  return (
    tierIsGap(r.manual) || tierIsGap(r.ui_auto) || tierIsGap(r.api_auto)
  );
}
