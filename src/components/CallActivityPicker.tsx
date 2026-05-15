import { Boxes, Plus, X } from 'lucide-react';
import type { DiagramSummary } from '../lib/diagramRepository';

export default function CallActivityPicker({
  open,
  callables,
  onPick,
  onCreateNew,
  onClose,
}: {
  open: boolean;
  callables: DiagramSummary[];
  onPick: (processId: string, name: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cap-title"
        className="w-96 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="cap-title"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Insert reusable sub-process
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={onCreateNew}
          className="mb-3 flex w-full items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Plus size={16} /> New reusable sub-process
        </button>

        <ul className="max-h-72 overflow-auto">
          {callables.length === 0 && (
            <li className="px-2 py-3 text-xs text-slate-400">
              No reusable sub-processes yet. Mark a diagram "Reusable" to make
              it callable.
            </li>
          )}
          {callables.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => c.process_id && onPick(c.process_id, c.name)}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                title={c.process_id ?? ''}
              >
                <Boxes size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
