import { saveAs } from 'file-saver';

export function exportBpmn(xml: string, filename = 'diagram.bpmn'): void {
  saveAs(new Blob([xml], { type: 'application/xml;charset=utf-8' }), filename);
}
