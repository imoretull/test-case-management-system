// YAML-frontmatter parser/serializer scoped to the subset we actually write:
// top-level scalars (strings, null) and flow-style arrays (`tags: [a, "b, c"]`).
// No nested objects, no block scalars, no multi-line strings.

export interface ParsedMd {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedMd {
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
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlowList(inner).map(parseScalar);
  }
  return parseScalar(s);
}

function parseScalar(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return JSON.parse(s.startsWith("'") ? `"${s.slice(1, -1)}"` : s);
  }
  return s;
}

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

// ---------------- serialization ----------------

const SAFE_BARE = /^[A-Za-z0-9_\-\/. ]+$/;

function serializeScalar(v: string): string {
  if (SAFE_BARE.test(v) && !/^\s|\s$/.test(v) && v !== '') return v;
  return JSON.stringify(v);
}

function serializeValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    return '[' + v.map((x) => serializeScalar(String(x))).join(', ') + ']';
  }
  return serializeScalar(String(v));
}

/**
 * Serialize a markdown file with frontmatter. `keyOrder` controls field order
 * so files round-trip stably (no diff noise from key reordering).
 */
export function serializeMd(
  data: Record<string, unknown>,
  body: string,
  keyOrder: string[] = [],
): string {
  const seen = new Set<string>();
  const lines: string[] = ['---'];
  for (const key of keyOrder) {
    if (key in data) {
      lines.push(`${key}: ${serializeValue(data[key])}`);
      seen.add(key);
    }
  }
  for (const [key, val] of Object.entries(data)) {
    if (seen.has(key)) continue;
    if (val === undefined) continue;
    lines.push(`${key}: ${serializeValue(val)}`);
  }
  lines.push('---');
  const trimmedBody = body.startsWith('\n') ? body : '\n' + body;
  return lines.join('\n') + trimmedBody;
}
