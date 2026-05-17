import { useState } from 'react';
import type { AutomatedTest, ManualCase } from '../core/types';
import { useRunStore } from '../execution/useRunStore';
import { SparklineRuns } from './shared/SparklineRuns';

type TestEntry =
  | { kind: 'manual'; test: ManualCase }
  | { kind: 'auto'; test: AutomatedTest };

interface ExpandedTestPanelProps {
  entry: TestEntry;
}

// Strip ":line" suffix off automatedTest.file_path so we pass just the file
// path to Playwright as a spec filter.
function stripLine(p: string | undefined): string | undefined {
  if (!p) return p;
  const idx = p.indexOf(':');
  return idx < 0 ? p : p.slice(0, idx);
}

// Pull the bare test title from "tests.ui.cart.test_add_item" → "test_add_item"
// so we can grep for it. Playwright -g does regex; we escape it.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deriveGrep(fqName: string): string {
  const last = fqName.split('.').pop() ?? fqName;
  return escapeRegex(last);
}

export function ExpandedTestPanel({ entry }: ExpandedTestPanelProps) {
  const run = useRunStore();
  const [error, setError] = useState<string | null>(null);

  async function runAutoTest(t: AutomatedTest) {
    setError(null);
    const spec = stripLine(t.file_path);
    try {
      await run.startRun({
        specs: spec ? [spec] : undefined,
        grep: deriveGrep(t.fq_name),
      });
      window.location.hash = '#/execution';
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (entry.kind === 'manual') {
    const t = entry.test;
    return (
      <div className="mt-2 ml-6 pl-4 border-l-2 border-blue-200 text-xs text-slate-700 space-y-1.5">
        <div>
          <span className="font-medium text-slate-500">Last 5 runs:</span>{' '}
          <SparklineRuns runs={['pass', 'pass', 'pass', 'skip', 'pass']} />
        </div>
        <div>
          <span className="font-medium text-slate-500">Linked stories:</span>{' '}
          <span className="font-mono">{t.story_keys.join(', ')}</span>
        </div>
        {t.steps && t.steps.length > 0 && (
          <div>
            <span className="font-medium text-slate-500">
              Steps ({t.steps.length}):
            </span>
            <ol className="list-decimal list-inside mt-1 space-y-0.5 text-slate-600">
              {t.steps.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
        <div className="flex items-center gap-4 text-slate-500">
          {t.owner && (
            <span>
              <span className="font-medium">Owner:</span> {t.owner}
            </span>
          )}
          {t.last_edited && (
            <span>
              <span className="font-medium">Last edited:</span> {t.last_edited}
            </span>
          )}
          {t.folder && (
            <span>
              <span className="font-medium">Folder:</span>{' '}
              <span className="font-mono">{t.folder}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled
            title="Manual cases are executed by humans, not the runner. Open the case in Test Cases to record results."
            className="px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded cursor-not-allowed"
            onClick={(e) => e.stopPropagation()}
          >
            Run now
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs text-slate-700 border border-slate-200 rounded hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              window.location.hash = '#/testcases';
            }}
          >
            Open in Test Cases
          </button>
        </div>
      </div>
    );
  }

  const t = entry.test;
  const canRun = run.capable && t.framework === 'playwright';
  const runBlockedReason = !run.capable
    ? 'Server adapter required to run tests.'
    : t.framework !== 'playwright'
      ? `Framework "${t.framework}" runs aren't wired yet — only Playwright.`
      : '';

  return (
    <div className="mt-2 ml-6 pl-4 border-l-2 border-blue-200 text-xs text-slate-700 space-y-1.5">
      <div>
        <span className="font-medium text-slate-500">Last 5 runs:</span>{' '}
        <SparklineRuns runs={t.last_5_runs ?? []} />
      </div>
      <div>
        <span className="font-medium text-slate-500">Linked stories:</span>{' '}
        <span className="font-mono">{t.jira_keys.join(', ')}</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap text-slate-500">
        <span>
          <span className="font-medium">Framework:</span> {t.framework}
        </span>
        {t.file_path && (
          <span>
            <span className="font-medium">File:</span>{' '}
            <span className="font-mono">{t.file_path}</span>
          </span>
        )}
        {t.owner && (
          <span>
            <span className="font-medium">Owner:</span> {t.owner}
          </span>
        )}
        {t.last_edited && (
          <span>
            <span className="font-medium">Last commit:</span> {t.last_edited}
          </span>
        )}
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!canRun}
          title={canRun ? '' : runBlockedReason}
          className={
            canRun
              ? 'px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700'
              : 'px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded cursor-not-allowed'
          }
          onClick={(e) => {
            e.stopPropagation();
            runAutoTest(t);
          }}
        >
          Run now
        </button>
        {t.ci_url && (
          <a
            href={t.ci_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 text-xs text-blue-700 border border-blue-200 rounded hover:bg-blue-50"
          >
            View CI run
          </a>
        )}
        <button
          type="button"
          className="px-2 py-1 text-xs text-slate-700 border border-slate-200 rounded hover:bg-slate-50"
          onClick={(e) => e.stopPropagation()}
        >
          Open in repo
        </button>
      </div>
    </div>
  );
}
