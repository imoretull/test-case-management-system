import { useEffect, useState } from 'react';
import type { ManualCase, ManualStatus, Story } from '../core/types';
import { useDataAdapter } from '../adapters/DataAdapterContext';

export type CaseEditorMode = 'create' | 'edit' | 'duplicate';

export interface CaseEditorModalProps {
  mode: CaseEditorMode;
  /** For edit/duplicate, the source case. For create, a partial default. */
  source?: Partial<ManualCase>;
  stories: Story[];
  onClose: () => void;
  /** Called with the saved case's id (or null on delete). */
  onSaved: (id: string | null) => void;
}

interface FormState {
  title: string;
  storyKeysCsv: string;
  folder: string;
  tagsCsv: string;
  status: ManualStatus;
  owner: string;
  stepsText: string; // one per line
}

function fromCase(c?: Partial<ManualCase>): FormState {
  return {
    title: c?.title ?? '',
    storyKeysCsv: (c?.story_keys ?? []).join(', '),
    folder: c?.folder ?? '',
    tagsCsv: (c?.tags ?? []).join(', '),
    status: c?.last_status ?? 'NOT_RUN',
    owner: c?.owner ?? '',
    stepsText: (c?.steps ?? []).join('\n'),
  };
}

function splitCsv(s: string): string[] {
  return s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSteps(s: string): string[] {
  return s
    .split('\n')
    .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean);
}

export function CaseEditorModal({
  mode,
  source,
  stories,
  onClose,
  onSaved,
}: CaseEditorModalProps) {
  const adapter = useDataAdapter();
  const [form, setForm] = useState<FormState>(() => fromCase(source));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape; trap focus loosely by autofocusing the title input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const titleHeading =
    mode === 'create'
      ? 'New manual case'
      : mode === 'duplicate'
        ? `Duplicate ${source?.id ?? ''}`
        : `Edit ${source?.id ?? ''}`;

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setError(null);
    const story_keys = splitCsv(form.storyKeysCsv);
    if (!form.title.trim()) return setError('Title is required.');
    if (story_keys.length === 0) return setError('At least one story key is required.');

    const payload: Omit<ManualCase, 'id'> = {
      title: form.title.trim(),
      folder: form.folder.trim(),
      tags: splitCsv(form.tagsCsv),
      story_keys,
      last_run: source?.last_run ?? null,
      last_status: form.status,
      steps: splitSteps(form.stepsText),
      owner: form.owner.trim() || undefined,
      last_edited: new Date().toISOString().slice(0, 10),
    };

    setSaving(true);
    try {
      if (mode === 'edit' && source?.id) {
        if (!adapter.updateManualCase) throw new Error('Adapter does not support edits.');
        const saved = await adapter.updateManualCase(source.id, payload);
        onSaved(saved.id);
      } else {
        if (!adapter.createManualCase) throw new Error('Adapter does not support creates.');
        const saved = await adapter.createManualCase(payload);
        onSaved(saved.id);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">{titleHeading}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <Field label="Title" required>
            <input
              autoFocus
              type="text"
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Add single item to empty cart"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Story keys" required hint="Comma-separated. First key determines the folder.">
              <input
                type="text"
                className="w-full text-sm font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.storyKeysCsv}
                onChange={(e) => update('storyKeysCsv', e.target.value)}
                placeholder="AMZN-1382, AMZN-1457"
                list="story-keys-list"
              />
              <datalist id="story-keys-list">
                {stories.map((s) => (
                  <option key={s.story_key} value={s.story_key}>
                    {s.title}
                  </option>
                ))}
              </datalist>
            </Field>

            <Field label="Status">
              <select
                className="w-full text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.status}
                onChange={(e) => update('status', e.target.value as ManualStatus)}
              >
                <option value="NOT_RUN">NOT_RUN</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Folder" hint="Free-form, e.g. /Cart/Add">
              <input
                type="text"
                className="w-full text-sm font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.folder}
                onChange={(e) => update('folder', e.target.value)}
              />
            </Field>

            <Field label="Owner">
              <input
                type="text"
                className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.owner}
                onChange={(e) => update('owner', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Tags" hint='Comma-separated, e.g. @smoke, @regression, @cart'>
            <input
              type="text"
              className="w-full text-sm font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={form.tagsCsv}
              onChange={(e) => update('tagsCsv', e.target.value)}
            />
          </Field>

          <Field label="Steps" hint="One per line. Leading numbering is stripped automatically.">
            <textarea
              rows={8}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono leading-relaxed"
              value={form.stepsText}
              onChange={(e) => update('stepsText', e.target.value)}
              placeholder={'1. Navigate to product page\n2. Click Add to cart\n3. Verify cart icon increments'}
            />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create case'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
