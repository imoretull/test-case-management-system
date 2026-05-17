// Core types & helpers
export type {
  AutomatedTest,
  AutoStatus,
  Bug,
  CoverageState,
  CoverageTally,
  Framework,
  ManualCase,
  ManualStatus,
  Story,
  StoryCoverage,
  TestType,
} from './core/types';

export {
  computeAllCoverage,
  computeStoryCoverage,
  hasAnyGap,
  sortByWorstFirst,
  type CoverageOptions,
} from './core/coverage';

// Adapters
export type { DataAdapter, StoryFilter } from './adapters/DataAdapter';
export { canWrite } from './adapters/DataAdapter';
export {
  DataAdapterProvider,
  useDataAdapter,
  useAdapterRevision,
  type DataAdapterProviderProps,
} from './adapters/DataAdapterContext';
export {
  HttpAdapter,
  type HttpAdapterOptions,
  type ChangeEvent,
  type ChangeListener,
  type RunListener,
} from './adapters/HttpAdapter';

// Runner event types
export type {
  RunEvent,
  RunStatus,
  TestDescriptor,
  TestStatus,
} from './runner/events';

// App shell (tab nav + tabs)
export { AppShell, type AppShellProps, type TabId } from './shell/AppShell';

// Individual views (also exported in case an app wants custom routing)
export { CoverageMatrix, type CoverageMatrixProps } from './dashboard/CoverageMatrix';
export { TestCasesView } from './testcases/TestCasesView';
export { ExecutionView } from './execution/ExecutionView';
