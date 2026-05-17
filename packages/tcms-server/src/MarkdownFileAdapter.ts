import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AutomatedTest,
  Bug,
  DataAdapter,
  ManualCase,
  Story,
  StoryFilter,
} from '@tcms/framework';
import { parseFrontmatter, serializeMd } from './frontmatter.ts';

export interface MarkdownFileAdapterOptions {
  /**
   * Absolute path to the app's data directory containing:
   *   - stories.json
   *   - bugs.json
   *   - automatedTests.json
   *   - manual/<STORY_KEY>/<TC>.md
   */
  dataRoot: string;
}

const FRONTMATTER_KEY_ORDER = [
  'id',
  'title',
  'folder',
  'tags',
  'story_keys',
  'last_run',
  'last_status',
  'owner',
  'last_edited',
];

const SLUG_MAX = 60;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX);
}

function caseFilename(id: string, title: string): string {
  return `${id}-${slugify(title)}.md`;
}

function extractSteps(body: string): string[] | undefined {
  const m = body.match(/##\s*Steps\s*\n([\s\S]*?)(?=\n##|\n*$)/);
  if (!m) return undefined;
  const steps = Array.from(m[1].matchAll(/^\s*\d+\.\s+(.+)$/gm)).map((mm) =>
    mm[1].trim(),
  );
  return steps.length > 0 ? steps : undefined;
}

function buildBody(c: { steps?: string[]; body?: string }): string {
  if (c.body) return c.body;
  if (!c.steps || c.steps.length === 0) {
    return '\n## Steps\n\n_No steps recorded yet._\n';
  }
  return (
    '\n## Steps\n\n' +
    c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
    '\n'
  );
}

export class MarkdownFileAdapter implements DataAdapter {
  private readonly dataRoot: string;
  private readonly manualRoot: string;

  // Mapping: case id → on-disk filename. Built lazily and refreshed on writes.
  private filenameIndex = new Map<string, { story: string; file: string }>();

  constructor(opts: MarkdownFileAdapterOptions) {
    this.dataRoot = opts.dataRoot;
    this.manualRoot = path.join(this.dataRoot, 'manual');
  }

  // ---------------- reads ----------------

  async listStories(filter?: StoryFilter): Promise<Story[]> {
    const stories: Story[] = await this.readJson('stories.json');
    return stories.filter((s) => {
      if (filter?.sprint && s.sprint !== filter.sprint) return false;
      if (filter?.epic && s.epic !== filter.epic) return false;
      return true;
    });
  }

  async listBugs(storyKey?: string): Promise<Bug[]> {
    const bugs: Bug[] = await this.readJson('bugs.json');
    if (!storyKey) return bugs;
    return bugs.filter((b) => b.story_keys.includes(storyKey));
  }

  async listAutomatedTests(storyKey?: string): Promise<AutomatedTest[]> {
    const tests: AutomatedTest[] = await this.readJson('automatedTests.json');
    if (!storyKey) return tests;
    return tests.filter((t) => t.jira_keys.includes(storyKey));
  }

  async listManualCases(storyKey?: string): Promise<ManualCase[]> {
    const cases = await this.scanManualCases();
    if (!storyKey) return cases;
    return cases.filter((c) => c.story_keys.includes(storyKey));
  }

  // ---------------- writes ----------------

  async createManualCase(c: Omit<ManualCase, 'id'>): Promise<ManualCase> {
    const id = await this.nextId();
    const created: ManualCase = { id, ...c };
    await this.writeManualCase(created);
    return created;
  }

  async updateManualCase(
    id: string,
    patch: Partial<ManualCase>,
  ): Promise<ManualCase> {
    const existing = await this.findManualCase(id);
    if (!existing) throw new Error(`No manual case with id ${id}`);
    // story_keys[0] determines which folder the file lives in; if it changes
    // we need to move the file.
    const merged: ManualCase = {
      ...existing,
      ...patch,
      id, // id is immutable
    };
    if (
      (patch.story_keys && patch.story_keys[0] !== existing.story_keys[0]) ||
      (patch.title && patch.title !== existing.title)
    ) {
      await this.deleteFileFor(id);
    }
    await this.writeManualCase(merged);
    return merged;
  }

  async deleteManualCase(id: string): Promise<void> {
    await this.deleteFileFor(id);
    this.filenameIndex.delete(id);
  }

  async bulkUpsertManualCases(cases: ManualCase[]): Promise<ManualCase[]> {
    const result: ManualCase[] = [];
    for (const c of cases) {
      const existing = await this.findManualCase(c.id);
      result.push(
        existing
          ? await this.updateManualCase(c.id, c)
          : await this.writeManualCase(c).then(() => c),
      );
    }
    return result;
  }

  // ---------------- helpers ----------------

  private async readJson<T>(filename: string): Promise<T> {
    const raw = await fs.readFile(path.join(this.dataRoot, filename), 'utf8');
    return JSON.parse(raw) as T;
  }

  private async scanManualCases(): Promise<ManualCase[]> {
    this.filenameIndex.clear();
    const out: ManualCase[] = [];

    let storyDirs: string[];
    try {
      storyDirs = await fs.readdir(this.manualRoot);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }

    for (const story of storyDirs) {
      const dir = path.join(this.manualRoot, story);
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) continue;
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const raw = await fs.readFile(path.join(dir, file), 'utf8');
        const { data, body } = parseFrontmatter(raw);
        const c: ManualCase = {
          id: data.id as string,
          title: data.title as string,
          folder: (data.folder as string) ?? '',
          tags: (data.tags as string[]) ?? [],
          story_keys: (data.story_keys as string[]) ?? [],
          last_run: (data.last_run as string | null) ?? null,
          last_status:
            (data.last_status as ManualCase['last_status']) ?? 'NOT_RUN',
          steps: extractSteps(body),
          owner: data.owner as string | undefined,
          last_edited: data.last_edited as string | undefined,
        };
        out.push(c);
        this.filenameIndex.set(c.id, { story, file });
      }
    }
    return out;
  }

  private async findManualCase(id: string): Promise<ManualCase | null> {
    const all = await this.scanManualCases();
    return all.find((c) => c.id === id) ?? null;
  }

  private async writeManualCase(c: ManualCase): Promise<void> {
    const story = c.story_keys[0];
    if (!story) throw new Error('Manual case must have at least one story_key');
    const dir = path.join(this.manualRoot, story);
    await fs.mkdir(dir, { recursive: true });

    const filename = caseFilename(c.id, c.title);
    const filepath = path.join(dir, filename);

    const data: Record<string, unknown> = {
      id: c.id,
      title: c.title,
      folder: c.folder,
      tags: c.tags,
      story_keys: c.story_keys,
      last_run: c.last_run,
      last_status: c.last_status,
    };
    if (c.owner) data.owner = c.owner;
    if (c.last_edited) data.last_edited = c.last_edited;

    const body = buildBody(c);
    await fs.writeFile(filepath, serializeMd(data, body, FRONTMATTER_KEY_ORDER));
    this.filenameIndex.set(c.id, { story, file: filename });
  }

  private async deleteFileFor(id: string): Promise<void> {
    let entry = this.filenameIndex.get(id);
    if (!entry) {
      // Rescan if index is cold
      await this.scanManualCases();
      entry = this.filenameIndex.get(id);
    }
    if (!entry) return;
    await fs.unlink(path.join(this.manualRoot, entry.story, entry.file));
  }

  /**
   * Determine the next case id: max(tc_NNN) + 1, zero-padded to 3 digits.
   * Falls back to tc_001 if none exist.
   */
  private async nextId(): Promise<string> {
    const cases = await this.scanManualCases();
    let max = 0;
    for (const c of cases) {
      const m = c.id.match(/^tc_(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `tc_${String(max + 1).padStart(3, '0')}`;
  }
}
