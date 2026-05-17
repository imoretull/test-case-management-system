import { useEffect, useState, type ReactNode } from 'react';
import type { CoverageOptions } from '../core/coverage';
import { CoverageMatrix } from '../dashboard/CoverageMatrix';
import { TestCasesView } from '../testcases/TestCasesView';
import { ExecutionView } from '../execution/ExecutionView';

export type TabId = 'dashboard' | 'testcases' | 'execution';

export interface AppShellProps {
  productName?: string;
  productKey?: string;
  coverageOptions?: CoverageOptions;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'testcases', label: 'Test Cases' },
  { id: 'execution', label: 'Execution' },
];

function readTabFromHash(): TabId {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (TABS.find((t) => t.id === h)?.id) ?? 'dashboard';
}

export function AppShell({
  productName,
  productKey,
  coverageOptions,
}: AppShellProps) {
  const [tab, setTab] = useState<TabId>(() => readTabFromHash());

  useEffect(() => {
    function onHash() {
      setTab(readTabFromHash());
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function goto(t: TabId) {
    window.location.hash = `#/${t}`;
    setTab(t);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TabNav active={tab} onChange={goto} productName={productName} />
      <div className="flex-1">
        {tab === 'dashboard' && (
          <CoverageMatrix
            productName={productName}
            productKey={productKey}
            coverageOptions={coverageOptions}
          />
        )}
        {tab === 'testcases' && <TestCasesView />}
        {tab === 'execution' && <ExecutionView />}
      </div>
    </div>
  );
}

interface TabNavProps {
  active: TabId;
  onChange: (t: TabId) => void;
  productName?: string;
}

function TabNav({ active, onChange, productName }: TabNavProps): ReactNode {
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6">
        <span className="text-sm font-semibold text-slate-700 py-3">
          TCMS{productName ? ` · ${productName}` : ''}
        </span>
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={
                  'px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                  (isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900')
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
