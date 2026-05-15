import { useState, type MutableRefObject } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  FilePlus2,
  Moon,
  PanelLeft,
  PanelRight,
  Pencil,
  Redo2,
  Save,
  Sun,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import type { BpmnApi } from '../hooks/useBpmnModeler';
import { useEditorStore } from '../store/editorStore';

export type ExportFormat = 'bpmn' | 'svg' | 'png' | 'pdf';

const btn =
  'flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700';

export default function Toolbar({
  apiRef,
  onNew,
  onSave,
  onImportClick,
  onExport,
}: {
  apiRef: MutableRefObject<BpmnApi | null>;
  onNew: () => void;
  onSave: () => void;
  onImportClick: () => void;
  onExport: (format: ExportFormat) => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const mode = useEditorStore((s) => s.mode);
  const dark = useEditorStore((s) => s.dark);
  const isDirty = useEditorStore((s) => s.isDirty);
  const toggleMode = useEditorStore((s) => s.toggleMode);
  const toggleDark = useEditorStore((s) => s.toggleDark);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const api = () => apiRef.current;

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
      <button className={btn} onClick={toggleSidebar} title="Toggle diagrams">
        <PanelLeft size={16} />
      </button>
      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

      <button className={btn} onClick={onNew}>
        <FilePlus2 size={16} /> New
      </button>
      <button className={btn} onClick={onImportClick}>
        <Upload size={16} /> Import
      </button>
      <button className={btn} onClick={onSave}>
        <Save size={16} /> Save{isDirty ? ' •' : ''}
      </button>

      <div className="relative">
        <button
          className={btn}
          onClick={() => setExportOpen((v) => !v)}
          onBlur={() => setTimeout(() => setExportOpen(false), 150)}
        >
          <Download size={16} /> Export <ChevronDown size={14} />
        </button>
        {exportOpen && (
          <div className="absolute z-20 mt-1 w-32 rounded border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {(['bpmn', 'svg', 'png', 'pdf'] as const).map((f) => (
              <button
                key={f}
                className="block w-full px-3 py-1 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => {
                  setExportOpen(false);
                  onExport(f);
                }}
              >
                .{f}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />
      <button
        className={btn}
        onClick={() => api()?.undo()}
        disabled={mode === 'view'}
      >
        <Undo2 size={16} />
      </button>
      <button
        className={btn}
        onClick={() => api()?.redo()}
        disabled={mode === 'view'}
      >
        <Redo2 size={16} />
      </button>
      <button className={btn} onClick={() => api()?.zoomOut()}>
        <ZoomOut size={16} />
      </button>
      <button className={btn} onClick={() => api()?.zoomIn()}>
        <ZoomIn size={16} />
      </button>
      <button className={btn} onClick={() => api()?.fit()}>
        <Maximize size={16} />
      </button>

      <span className="ml-auto" />
      <button className={btn} onClick={toggleMode}>
        {mode === 'edit' ? <Eye size={16} /> : <Pencil size={16} />}
        {mode === 'edit' ? 'Read-only' : 'Edit'}
      </button>
      <button
        className={btn}
        onClick={togglePanel}
        disabled={mode === 'view'}
        title="Toggle properties"
      >
        <PanelRight size={16} />
      </button>
      <button className={btn} onClick={toggleDark} title="Toggle theme">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
