import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import minimapModule from 'diagram-js-minimap';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

import { makeEmptyDiagram } from '../lib/diagrams/emptyDiagram';
import { useEditorStore } from '../store/editorStore';

export interface BpmnApi {
  importXml: (xml: string) => Promise<void>;
  getXml: () => Promise<string>;
  getSvg: () => Promise<string>;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

interface CanvasSvc {
  zoom: (level?: number | string, center?: unknown) => number;
}
interface CommandStackSvc {
  undo: () => void;
  redo: () => void;
}
interface EventBusSvc {
  on: (event: string, cb: (e?: unknown) => void) => void;
}
interface ElementRegistrySvc {
  getAll: () => Array<{ type: string }>;
}
interface BpmnInstance {
  importXML: (xml: string) => Promise<{ warnings: unknown[] }>;
  saveXML: (opts?: { format?: boolean }) => Promise<{ xml?: string }>;
  saveSVG: () => Promise<{ svg: string }>;
  get: <T>(name: string) => T;
  destroy: () => void;
}
type BpmnCtor = new (opts: Record<string, unknown>) => BpmnInstance;

// bpmn-js types don't model the `propertiesPanel` option or a Modeler/Viewer
// union; one documented cast keeps the rest of the file fully typed.
const Modeler = BpmnModeler as unknown as BpmnCtor;
const Viewer = NavigatedViewer as unknown as BpmnCtor;

function countElements(inst: BpmnInstance): number {
  try {
    return inst
      .get<ElementRegistrySvc>('elementRegistry')
      .getAll()
      .filter(
        (e) =>
          e.type !== 'label' &&
          e.type !== 'bpmn:Process' &&
          e.type !== 'bpmn:Definitions' &&
          !e.type.startsWith('bpmndi:'),
      ).length;
  } catch {
    return 0;
  }
}

export function useBpmnModeler(
  canvasRef: RefObject<HTMLDivElement>,
  panelRef: RefObject<HTMLDivElement>,
  apiRef: MutableRefObject<BpmnApi | null>,
): void {
  const mode = useEditorStore((s) => s.mode);
  const xmlRef = useRef<string>('');
  if (!xmlRef.current) xmlRef.current = makeEmptyDiagram();

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const common: Record<string, unknown> = {
      container: canvasEl,
      keyboard: { bindTo: document },
    };

    const inst: BpmnInstance =
      mode === 'edit'
        ? new Modeler({
            ...common,
            propertiesPanel: panelRef.current
              ? { parent: panelRef.current }
              : undefined,
            additionalModules: [
              BpmnPropertiesPanelModule,
              BpmnPropertiesProviderModule,
              minimapModule,
            ],
          })
        : new Viewer({ ...common, additionalModules: [minimapModule] });

    const syncZoom = () => {
      try {
        useEditorStore
          .getState()
          .setZoom(Number(inst.get<CanvasSvc>('canvas').zoom()) || 1);
      } catch {
        /* canvas not ready */
      }
    };

    const bus = inst.get<EventBusSvc>('eventBus');
    bus.on('import.done', () =>
      useEditorStore.getState().setElementCount(countElements(inst)),
    );
    bus.on('commandStack.changed', () => {
      useEditorStore.getState().setDirty(true);
      useEditorStore.getState().setElementCount(countElements(inst));
      void inst.saveXML({ format: true }).then((r) => {
        if (r.xml) xmlRef.current = r.xml;
      });
    });
    bus.on('canvas.viewbox.changed', syncZoom);

    const fit = () => {
      try {
        inst.get<CanvasSvc>('canvas').zoom('fit-viewport', 'auto');
      } catch {
        /* not ready */
      }
    };

    const api: BpmnApi = {
      importXml: async (xml) => {
        xmlRef.current = xml;
        await inst.importXML(xml);
        fit();
        useEditorStore.getState().setDirty(false);
      },
      getXml: async () => (await inst.saveXML({ format: true })).xml ?? '',
      getSvg: async () => (await inst.saveSVG()).svg,
      undo: () => {
        if (mode === 'edit') inst.get<CommandStackSvc>('commandStack').undo();
      },
      redo: () => {
        if (mode === 'edit') inst.get<CommandStackSvc>('commandStack').redo();
      },
      zoomIn: () => {
        const c = inst.get<CanvasSvc>('canvas');
        c.zoom(Number(c.zoom()) * 1.2);
      },
      zoomOut: () => {
        const c = inst.get<CanvasSvc>('canvas');
        c.zoom(Number(c.zoom()) / 1.2);
      },
      fit,
    };
    apiRef.current = api;

    void inst
      .importXML(xmlRef.current)
      .then(() => {
        fit();
        useEditorStore.getState().setDirty(false);
        useEditorStore.getState().setElementCount(countElements(inst));
      })
      .catch(() => {
        /* malformed bootstrap xml — explicit ops surface their own errors */
      });

    return () => {
      if (apiRef.current === api) apiRef.current = null;
      inst.destroy();
    };
    // Stable refs; the canvas is rebuilt only when edit/view mode flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
}
