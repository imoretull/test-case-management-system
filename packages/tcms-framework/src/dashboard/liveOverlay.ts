import { useEffect, useState } from 'react';
import type { AutomatedTest, AutoStatus } from '../core/types';
import { useDataAdapter } from '../adapters/DataAdapterContext';
import type { HttpAdapter } from '../adapters/HttpAdapter';
import type { RunEvent } from '../runner/events';

// Convert a Playwright test path to the same shape we store in
// AutomatedTest.fq_name. We use the last two segments (describe block + test
// title) joined with ".":
//   ["api", "api\\orders.spec.ts", "Orders API", "GET / returns 200"]
//     → "Orders API.GET / returns 200"
function pathToFqName(p: string[]): string {
  return p.slice(-2).join('.');
}

// Map Playwright statuses → our AutomatedTest.last_status type.
function mapStatus(s: RunEvent extends { kind: 'testEnd' } ? string : string): AutoStatus | null {
  switch (s) {
    case 'passed':
      return 'pass';
    case 'failed':
    case 'timedOut':
      return 'fail';
    case 'skipped':
      return 'skip';
    case 'interrupted':
      return 'error';
    default:
      return null;
  }
}

export type LiveStatus = AutoStatus | 'running';

interface AdapterMaybeWithRuns {
  subscribeRunEvents?: HttpAdapter['subscribeRunEvents'];
}

/**
 * Subscribes to run events and returns a live map of fq_name → status that
 * reflects the most recent test outcome since this hook mounted.
 *
 * Tests transition: → 'running' (on testBegin) → 'pass'/'fail'/etc (on testEnd).
 * Entries persist after the run ends so the pill stays accurate.
 */
export function useLiveAutoStatuses(): Map<string, LiveStatus> {
  const adapter = useDataAdapter() as AdapterMaybeWithRuns;
  const [statuses, setStatuses] = useState<Map<string, LiveStatus>>(
    () => new Map(),
  );

  useEffect(() => {
    if (typeof adapter.subscribeRunEvents !== 'function') return;
    const unsub = adapter.subscribeRunEvents((evt) => {
      if (evt.kind === 'testBegin') {
        const key = pathToFqName(evt.path);
        setStatuses((m) => {
          const next = new Map(m);
          next.set(key, 'running');
          return next;
        });
      } else if (evt.kind === 'testEnd') {
        const key = pathToFqName(evt.path);
        const mapped = mapStatus(evt.status);
        if (!mapped) return;
        setStatuses((m) => {
          const next = new Map(m);
          next.set(key, mapped);
          return next;
        });
      }
    });
    return unsub;
  }, [adapter]);

  return statuses;
}

/**
 * Returns a new array of automated tests with `last_status` overridden by
 * any live results we've seen since mount. 'running' is mapped down to its
 * static value (we don't want to show "running" in the pass/total count) —
 * the dashboard pill simply reflects the final resolved status when known.
 */
export function applyLiveOverlay(
  tests: AutomatedTest[],
  live: Map<string, LiveStatus>,
): AutomatedTest[] {
  if (live.size === 0) return tests;
  return tests.map((t) => {
    const status = live.get(t.fq_name);
    if (!status || status === 'running') return t;
    if (status === t.last_status) return t;
    return { ...t, last_status: status };
  });
}
