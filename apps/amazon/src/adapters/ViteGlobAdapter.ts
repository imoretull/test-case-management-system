import type {
  AutomatedTest,
  Bug,
  DataAdapter,
  ManualCase,
  Story,
  StoryFilter,
} from '@tcms/framework';

// Static JSON imports — Vite bundles these at build time.
import storiesJson from '../../data/stories.json';
import bugsJson from '../../data/bugs.json';
import automatedTestsJson from '../../data/automatedTests.json';

// Markdown files for manual cases. `eager: true` + `?raw` returns each
// file's contents synchronously as a string at module-load time.
const manualMarkdownFiles = import.meta.glob('../../data/manual/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// ---------------- minimal frontmatter parser ----------------

interface ParsedMd {
  data: Record<string, unknown>;
  body: string;
}

/**
 * Split a markdown file into frontmatter (between leading `---` fences) and
 * body. Supports the subset we actually write: top-level scalars (strings,
 * null) and flow-style arrays — e.g. `tags: [A, B]`. No nested maps, no
 * block scalars, no multi-line strings.
 */
function parseFrontmatter(raw: string): ParsedMd {
  // Use a non-greedy match so the closing fence is the FIRST `---`, not the last.
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const [, yaml, body] = m;
  const data: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colonAt = line.indexOf(':');
    if (colonAt < 0) continue;
    const key = line.slice(0, colonAt).trim();
    const rawValue = line.slice(colonAt + 1).trim();
    data[key] = parseValue(rawValue);
  }
  return { data, body };
}

function parseValue(s: string): unknown {
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;

  // Flow-style array: [A, B, "C, with comma"]
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlowList(inner).map(parseScalar);
  }
  return parseScalar(s);
}

// Quoted strings stay verbatim; bare strings are returned as-is.
function parseScalar(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return JSON.parse(s.startsWith("'") ? `"${s.slice(1, -1)}"` : s);
  }
  return s;
}

// Split "A, B, \"C, D\"" → ["A", "B", "\"C, D\""], respecting quotes.
function splitFlowList(s: string): string[] {
  const out: string[] = [];
  let buf = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      buf += ch;
      if (ch === quote && s[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ',') {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// ---------------- adapter ----------------

function parseManualCase(raw: string): ManualCase {
  const { data, body } = parseFrontmatter(raw);
  return {
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
}

// Pull numbered list items from the "## Steps" section of the markdown body.
function extractSteps(body: string): string[] | undefined {
  const stepsMatch = body.match(/##\s*Steps\s*\n([\s\S]*?)(?=\n##|\n*$)/);
  if (!stepsMatch) return undefined;
  const block = stepsMatch[1];
  const steps = Array.from(block.matchAll(/^\s*\d+\.\s+(.+)$/gm)).map(
    (m) => m[1].trim(),
  );
  return steps.length > 0 ? steps : undefined;
}

const NOT_IMPLEMENTED = (op: string) =>
  new Error(
    `ViteGlobAdapter is read-only in v1. \`${op}\` will be available once ` +
      `the local TCMS server lands (step 3). Edit the markdown file directly ` +
      `for now.`,
  );

export class ViteGlobAdapter implements DataAdapter {
  private readonly stories: Story[] = storiesJson as Story[];
  private readonly bugs: Bug[] = bugsJson as Bug[];
  private readonly automatedTests: AutomatedTest[] =
    automatedTestsJson as AutomatedTest[];
  private readonly manualCases: ManualCase[] = Object.values(
    manualMarkdownFiles,
  ).map(parseManualCase);

  async listStories(filter?: StoryFilter): Promise<Story[]> {
    return this.stories.filter((s) => {
      if (filter?.sprint && s.sprint !== filter.sprint) return false;
      if (filter?.epic && s.epic !== filter.epic) return false;
      return true;
    });
  }

  async listManualCases(storyKey?: string): Promise<ManualCase[]> {
    if (!storyKey) return this.manualCases;
    return this.manualCases.filter((c) => c.story_keys.includes(storyKey));
  }

  async listAutomatedTests(storyKey?: string): Promise<AutomatedTest[]> {
    if (!storyKey) return this.automatedTests;
    return this.automatedTests.filter((t) => t.jira_keys.includes(storyKey));
  }

  async listBugs(storyKey?: string): Promise<Bug[]> {
    if (!storyKey) return this.bugs;
    return this.bugs.filter((b) => b.story_keys.includes(storyKey));
  }

  async createManualCase(): Promise<ManualCase> {
    throw NOT_IMPLEMENTED('createManualCase');
  }
  async updateManualCase(): Promise<ManualCase> {
    throw NOT_IMPLEMENTED('updateManualCase');
  }
  async deleteManualCase(): Promise<void> {
    throw NOT_IMPLEMENTED('deleteManualCase');
  }
  async bulkUpsertManualCases(): Promise<ManualCase[]> {
    throw NOT_IMPLEMENTED('bulkUpsertManualCases');
  }
}
