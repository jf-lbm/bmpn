import { FilePlus2, Trash2 } from 'lucide-react';
import type { DiagramSummary } from '../lib/diagramRepository';
import { useEditorStore } from '../store/editorStore';

export default function DiagramSidebar({
  diagrams,
  currentId,
  onOpen,
  onNew,
  onDelete,
}: {
  diagrams: DiagramSummary[];
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const open = useEditorStore((s) => s.sidebarOpen);

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-0'
      } flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50 transition-[width] duration-150 dark:border-slate-700 dark:bg-slate-800`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Diagrams
        </span>
        <button
          onClick={onNew}
          title="New diagram"
          className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <FilePlus2 size={16} />
        </button>
      </div>
      <ul className="flex-1 overflow-auto px-1 pb-2">
        {diagrams.length === 0 && (
          <li className="px-2 py-2 text-xs text-slate-400">No diagrams yet</li>
        )}
        {diagrams.map((d) => (
          <li key={d.id}>
            <div
              className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${
                d.id === currentId
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                  : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <button
                onClick={() => onOpen(d.id)}
                className="flex-1 truncate text-left"
                title={d.name}
              >
                {d.name}
              </button>
              <button
                onClick={() => onDelete(d.id)}
                title="Delete"
                className="rounded p-0.5 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
