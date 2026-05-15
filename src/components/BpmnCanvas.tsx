import { useRef, type MutableRefObject } from 'react';
import { useBpmnModeler, type BpmnApi } from '../hooks/useBpmnModeler';
import { useEditorStore } from '../store/editorStore';
import PropertiesPanel from './PropertiesPanel';

export default function BpmnCanvas({
  apiRef,
}: {
  apiRef: MutableRefObject<BpmnApi | null>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useBpmnModeler(canvasRef, panelRef, apiRef);
  const elementCount = useEditorStore((s) => s.elementCount);

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={canvasRef}
        className="min-w-0 flex-1 bg-white dark:bg-slate-900"
      />
      {elementCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Drop a .bpmn file or start modeling
        </div>
      )}
      <PropertiesPanel panelRef={panelRef} />
    </div>
  );
}
