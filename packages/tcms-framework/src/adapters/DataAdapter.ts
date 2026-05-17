import type {
  AutomatedTest,
  Bug,
  ManualCase,
  Story,
} from '../core/types';

export interface StoryFilter {
  sprint?: string;
  epic?: string;
}

/**
 * DataAdapter abstracts where TCMS data lives. The framework UI never reads
 * mock data, files, or APIs directly — it always goes through an adapter.
 *
 * v1 implementations:
 *   - ViteGlobAdapter (apps/amazon)  reads from bundled JSON + markdown
 *   - HttpAdapter (deferred to v2)   talks to the local Node server
 *
 * All read methods are async so adapters that hit the network or filesystem
 * fit the same interface as ones that resolve from memory.
 */
export interface DataAdapter {
  // ---------------- Reads ----------------
  listStories(filter?: StoryFilter): Promise<Story[]>;
  listManualCases(storyKey?: string): Promise<ManualCase[]>;
  listAutomatedTests(storyKey?: string): Promise<AutomatedTest[]>;
  listBugs(storyKey?: string): Promise<Bug[]>;

  // ---------------- Writes (manual cases only) ----------------
  // Automated tests are owned by .spec files on disk and not editable via TCMS.
  // Stories and bugs are sourced from Jira (or equivalent) in real deployments.
  createManualCase?(c: Omit<ManualCase, 'id'>): Promise<ManualCase>;
  updateManualCase?(id: string, patch: Partial<ManualCase>): Promise<ManualCase>;
  deleteManualCase?(id: string): Promise<void>;
  bulkUpsertManualCases?(cases: ManualCase[]): Promise<ManualCase[]>;
}

/**
 * Capability check — adapters may omit write methods (e.g. read-only Jira
 * mirrors). UI code that offers edit affordances should check before showing
 * the relevant buttons.
 */
export function canWrite(a: DataAdapter): boolean {
  return typeof a.createManualCase === 'function'
    && typeof a.updateManualCase === 'function'
    && typeof a.deleteManualCase === 'function';
}
