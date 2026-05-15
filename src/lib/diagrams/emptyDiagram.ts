import { bpmnId } from '../ids';

/**
 * Builds an empty BPMN 2.0 diagram with freshly generated, org-unique
 * ids. Call this once per *persisted* new diagram — two saved diagrams
 * must not share a process id, or cross-diagram `calledElement`
 * references would be ambiguous. (The editor hook may hold a single
 * generated bootstrap string and reuse it across renders; that is fine —
 * it is transient and never persisted.)
 */
export function makeEmptyDiagram(): string {
  const defs = bpmnId('Definitions');
  const proc = bpmnId('Process');
  const start = bpmnId('StartEvent');
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="${defs}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${proc}" isExecutable="false">
    <bpmn:startEvent id="${start}" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${proc}">
      <bpmndi:BPMNShape id="${start}_di" bpmnElement="${start}">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
