import type {
  AutomatedTest,
  Bug,
  ManualCase,
  Story,
} from '../core/types';
import type { RunEvent } from '../runner/events';
import type { DataAdapter, StoryFilter } from './DataAdapter';

export interface HttpAdapterOptions {
  /**
   * Base URL of the TCMS server. In dev this is "" (same origin, Vite proxy).
   * In production it's whatever the server is hosted at.
   */
  baseUrl?: string;
}

export type ChangeEvent =
  | { kind: 'manualCase.created'; payload: { id: string } }
  | { kind: 'manualCase.updated'; payload: { id: string } }
  | { kind: 'manualCase.deleted'; payload: { id: string } }
  | { kind: 'files.changed'; payload: { event: string; path: string } };

export type ChangeListener = (e: ChangeEvent) => void;

export type RunListener = (e: RunEvent) => void;

export class HttpAdapter implements DataAdapter {
  private readonly base: string;
  private es: EventSource | null = null;
  private listeners = new Set<ChangeListener>();
  private runEs: EventSource | null = null;
  private runListeners = new Set<RunListener>();

  constructor(opts: HttpAdapterOptions = {}) {
    this.base = (opts.baseUrl ?? '').replace(/\/$/, '');
  }

  // ---------------- reads ----------------

  async listStories(filter?: StoryFilter): Promise<Story[]> {
    const qs = new URLSearchParams();
    if (filter?.sprint) qs.set('sprint', filter.sprint);
    if (filter?.epic) qs.set('epic', filter.epic);
    return this.getJson<Story[]>(`/api/stories${this.qs(qs)}`);
  }

  async listBugs(storyKey?: string): Promise<Bug[]> {
    const qs = new URLSearchParams();
    if (storyKey) qs.set('story', storyKey);
    return this.getJson<Bug[]>(`/api/bugs${this.qs(qs)}`);
  }

  async listAutomatedTests(storyKey?: string): Promise<AutomatedTest[]> {
    const qs = new URLSearchParams();
    if (storyKey) qs.set('story', storyKey);
    return this.getJson<AutomatedTest[]>(`/api/automated-tests${this.qs(qs)}`);
  }

  async listManualCases(storyKey?: string): Promise<ManualCase[]> {
    const qs = new URLSearchParams();
    if (storyKey) qs.set('story', storyKey);
    return this.getJson<ManualCase[]>(`/api/manual-cases${this.qs(qs)}`);
  }

  // ---------------- writes ----------------

  async createManualCase(c: Omit<ManualCase, 'id'>): Promise<ManualCase> {
    return this.send<ManualCase>('POST', '/api/manual-cases', c);
  }

  async updateManualCase(id: string, patch: Partial<ManualCase>): Promise<ManualCase> {
    return this.send<ManualCase>('PATCH', `/api/manual-cases/${encodeURIComponent(id)}`, patch);
  }

  async deleteManualCase(id: string): Promise<void> {
    const res = await fetch(`${this.base}/api/manual-cases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await this.errorMessage(res));
  }

  async bulkUpsertManualCases(cases: ManualCase[]): Promise<ManualCase[]> {
    // Server doesn't have a bulk endpoint yet — fan out client-side.
    return Promise.all(
      cases.map((c) =>
        this.send<ManualCase>(
          'PATCH',
          `/api/manual-cases/${encodeURIComponent(c.id)}`,
          c,
        ).catch(() => this.send<ManualCase>('POST', '/api/manual-cases', c)),
      ),
    );
  }

  // ---------------- SSE: data change subscription ----------------

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    this.ensureEventSource();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.es?.close();
        this.es = null;
      }
    };
  }

  private ensureEventSource(): void {
    if (this.es) return;
    this.es = new EventSource(`${this.base}/api/events`);
    this.es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as ChangeEvent;
        for (const l of this.listeners) l(data);
      } catch {
        // ignore malformed payloads (keepalive comments etc.)
      }
    };
    this.es.onerror = () => {
      // Browsers auto-reconnect; nothing to do here. If the server is fully
      // down, listeners just won't fire until it comes back.
    };
  }

  // ---------------- Runs ----------------

  async startRun(opts: { specs?: string[]; grep?: string } = {}): Promise<string> {
    const data = await this.send<{ runId: string }>('POST', '/api/runs', opts);
    return data.runId;
  }

  async cancelRun(runId: string): Promise<void> {
    const res = await fetch(`${this.base}/api/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) throw new Error(await this.errorMessage(res));
  }

  subscribeRunEvents(listener: RunListener): () => void {
    this.runListeners.add(listener);
    this.ensureRunEventSource();
    return () => {
      this.runListeners.delete(listener);
      if (this.runListeners.size === 0) {
        this.runEs?.close();
        this.runEs = null;
      }
    };
  }

  private ensureRunEventSource(): void {
    if (this.runEs) return;
    this.runEs = new EventSource(`${this.base}/api/runs/events`);
    this.runEs.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as RunEvent;
        for (const l of this.runListeners) l(data);
      } catch {
        // ignore malformed payloads
      }
    };
    this.runEs.onerror = () => {
      // EventSource auto-reconnects.
    };
  }

  // ---------------- helpers ----------------

  private qs(p: URLSearchParams): string {
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  private async getJson<T>(pathStr: string): Promise<T> {
    const res = await fetch(`${this.base}${pathStr}`);
    if (!res.ok) throw new Error(await this.errorMessage(res));
    return res.json() as Promise<T>;
  }

  private async send<T>(method: 'POST' | 'PATCH', pathStr: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${pathStr}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await this.errorMessage(res));
    return res.json() as Promise<T>;
  }

  private async errorMessage(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { error?: string };
      return data.error ?? `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  }
}
