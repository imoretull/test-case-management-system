import { useState } from 'react';

export type AddKind = 'manual' | 'ui' | 'api' | 'link';

interface AddButtonProps {
  storyKey: string;
  kind: AddKind;
}

const LABEL: Record<AddKind, string> = {
  manual: '+ Add manual case',
  ui: '+ Add UI automation',
  api: '+ Add API automation',
  link: '+ Link existing',
};

const HEADING: Record<AddKind, string> = {
  manual: 'Add manual test case',
  ui: 'Add UI automation backlog item',
  api: 'Add API automation backlog item',
  link: 'Link an existing test',
};

const DESCRIPTION: Record<AddKind, string> = {
  manual:
    'Capture a new manual test case linked to this story. The case will appear in the test editor with the JIRA key pre-filled.',
  ui: 'Create a backlog entry for the SDET team. Includes story key and test type so the team can pick it up directly.',
  api: 'Create a backlog entry for the API team. Includes story key and test type so the team can pick it up directly.',
  link: 'Open the test picker filtered to tests not yet linked to any story. Useful when the test already exists but the JIRA reference was missed.',
};

export function AddButton({ storyKey, kind }: AddButtonProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setOpen(false);
      setSaved(false);
      setNotes('');
    }, 900);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
      >
        {LABEL[kind]}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800">
              {HEADING[kind]}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{DESCRIPTION[kind]}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Story
                </label>
                <input
                  className="mt-1 w-full px-2 py-1 text-sm font-mono border border-slate-200 rounded bg-slate-50 text-slate-700"
                  value={storyKey}
                  readOnly
                />
              </div>
              {kind !== 'link' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      kind === 'manual'
                        ? 'What does the new manual case verify?'
                        : 'What scenario should automation cover?'
                    }
                    className="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              {saved ? (
                <span className="text-xs text-green-700">
                  ✅ Saved to backlog
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    {kind === 'link' ? 'Open picker' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
