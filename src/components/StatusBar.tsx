import { useEditorStore } from '../store/editorStore';

export default function StatusBar() {
  const elementCount = useEditorStore((s) => s.elementCount);
  const zoom = useEditorStore((s) => s.zoom);
  const mode = useEditorStore((s) => s.mode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

  const status = isSaving
    ? 'Saving…'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? 'Saved'
        : '—';

  return (
    <div className="flex h-7 items-center gap-4 border-t border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      <span>{elementCount} elements</span>
      <span>{Math.round(zoom * 100)}%</span>
      <span>{mode === 'view' ? 'Read-only' : 'Editing'}</span>
      <span className="ml-auto">{status}</span>
    </div>
  );
}
