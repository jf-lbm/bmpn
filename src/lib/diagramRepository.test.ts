import { describe, it, expect } from 'vitest';
import { buildDiagramInsert } from './diagramRepository';

describe('buildDiagramInsert', () => {
  it('derives process_id from the xml and defaults is_callable to false', () => {
    const row = buildDiagramInsert({
      orgId: 'org_1',
      ownerId: 'user_1',
      name: 'Untitled',
      bpmnXml: '<bpmn:process id="Process_dead0001"/>',
    });
    expect(row).toEqual({
      org_id: 'org_1',
      owner_id: 'user_1',
      name: 'Untitled',
      bpmn_xml: '<bpmn:process id="Process_dead0001"/>',
      process_id: 'Process_dead0001',
      is_callable: false,
    });
  });

  it('honors an explicit is_callable flag', () => {
    const row = buildDiagramInsert({
      orgId: 'o',
      ownerId: 'u',
      name: 'Lib',
      bpmnXml: '<process id="P"/>',
      isCallable: true,
    });
    expect(row.is_callable).toBe(true);
    expect(row.process_id).toBe('P');
  });
});
