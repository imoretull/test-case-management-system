import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { DataAdapter } from './DataAdapter';
import type { ChangeListener } from './HttpAdapter';

interface ContextValue {
  adapter: DataAdapter;
  /**
   * Bumps every time the adapter emits a change event (via subscribe). Views
   * that include this in their effect deps will auto-refresh when data
   * changes on disk or via another client.
   */
  revision: number;
}

const DataAdapterContext = createContext<ContextValue | null>(null);

// Subscribable adapters expose `.subscribe(listener) => unsubscribe`.
// Only HttpAdapter has it today; ViteGlobAdapter does not.
interface SubscribableAdapter {
  subscribe(listener: ChangeListener): () => void;
}

function isSubscribable(a: DataAdapter): a is DataAdapter & SubscribableAdapter {
  return typeof (a as Partial<SubscribableAdapter>).subscribe === 'function';
}

export interface DataAdapterProviderProps {
  adapter: DataAdapter;
  children: ReactNode;
}

export function DataAdapterProvider({
  adapter,
  children,
}: DataAdapterProviderProps) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isSubscribable(adapter)) return;
    const unsub = adapter.subscribe(() => {
      setRevision((r) => r + 1);
    });
    return unsub;
  }, [adapter]);

  return (
    <DataAdapterContext.Provider value={{ adapter, revision }}>
      {children}
    </DataAdapterContext.Provider>
  );
}

export function useDataAdapter(): DataAdapter {
  const ctx = useContext(DataAdapterContext);
  if (!ctx) {
    throw new Error(
      'useDataAdapter must be used inside <DataAdapterProvider>. ' +
        'Did you forget to wrap your app?',
    );
  }
  return ctx.adapter;
}

/**
 * Bumps each time the adapter pushes a change event. Include this in an
 * effect's deps to auto-refresh data when files change on disk.
 */
export function useAdapterRevision(): number {
  const ctx = useContext(DataAdapterContext);
  if (!ctx) {
    throw new Error('useAdapterRevision must be used inside <DataAdapterProvider>.');
  }
  return ctx.revision;
}
