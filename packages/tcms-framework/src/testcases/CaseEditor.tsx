import type { ManualCase } from '../core/types';

interface CaseEditorProps {
  manualCase: ManualCase;
  canWrite: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function CaseEditor({
  manualCase: c,
  canWrite,
  onEdit,
  onDuplicate,
  onDelete,
}: CaseEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs text-slate-500">{c.id}</div>
            <h2 className="text-lg font-semibold text-slate-800 mt-0.5">
              {c.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canWrite}
              title={canWrite ? '' : 'This adapter is read-only.'}
              onClick={onDelete}
              className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
            <button
              type="button"
              disabled={!canWrite}
              title={canWrite ? '' : 'This adapter is read-only.'}
              onClick={onDuplicate}
              className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={!canWrite}
              title={canWrite ? '' : 'This adapter is read-only.'}
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit
            </button>
          </div>
        </div>
      </header>

      {!canWrite && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800">
          Read-only · this adapter doesn't support writes. Run the TCMS server
          to enable editing.
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <section className="grid grid-cols-2 gap-4">
          <Field label="Story keys">
            <span className="font-mono text-sm text-slate-700">
              {c.story_keys.join(', ')}
            </span>
          </Field>
          <Field label="Status">
            <span className="text-sm text-slate-700">{c.last_status}</span>
          </Field>
          <Field label="Folder">
            <span className="font-mono text-sm text-slate-700">
              {c.folder || '—'}
            </span>
          </Field>
          <Field label="Last run">
            <span className="text-sm text-slate-700">{c.last_run ?? '—'}</span>
          </Field>
          <Field label="Owner">
            <span className="text-sm text-slate-700">{c.owner ?? '—'}</span>
          </Field>
          <Field label="Last edited">
            <span className="text-sm text-slate-700">
              {c.last_edited ?? '—'}
            </span>
          </Field>
        </section>

        <section>
          <Label>Tags</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.tags.length === 0 ? (
              <span className="text-sm text-slate-400">No tags</span>
            ) : (
              c.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-xs font-mono text-slate-700"
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </section>

        <section>
          <Label>Steps</Label>
          {c.steps && c.steps.length > 0 ? (
            <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-slate-700">
              {c.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-slate-400">No steps recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
