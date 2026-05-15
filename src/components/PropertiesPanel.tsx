import type { RefObject } from 'react';
import { useEditorStore } from '../store/editorStore';

export default function PropertiesPanel({
  panelRef,
}: {
  panelRef: RefObject<HTMLDivElement>;
}) {
  const panelOpen = useEditorStore((s) => s.panelOpen);
  const mode = useEditorStore((s) => s.mode);
  const visible = panelOpen && mode === 'edit';

  return (
    <div
      className={`${
        visible ? 'w-80' : 'w-0'
      } shrink-0 overflow-hidden border-l border-slate-200 bg-slate-50 transition-[width] duration-150 dark:border-slate-700 dark:bg-slate-800`}
    >
      <div ref={panelRef} className="h-full w-80 overflow-auto" />
    </div>
  );
}
