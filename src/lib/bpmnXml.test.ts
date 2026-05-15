import { describe, it, expect } from 'vitest';
import { extractProcessId } from './bpmnXml';

describe('extractProcessId', () => {
  it('reads a prefixed bpmn:process id', () => {
    const xml =
      '<bpmn:definitions><bpmn:process id="Process_a1b2c3d4" isExecutable="false"/></bpmn:definitions>';
    expect(extractProcessId(xml)).toBe('Process_a1b2c3d4');
  });

  it('reads a default-namespace process id', () => {
    const xml = '<definitions>\n  <process id="P_1">\n  </process>\n</definitions>';
    expect(extractProcessId(xml)).toBe('P_1');
  });

  it('returns the first process when several exist', () => {
    const xml =
      '<x><bpmn:process id="First"/><bpmn:process id="Second"/></x>';
    expect(extractProcessId(xml)).toBe('First');
  });

  it('returns null when there is no process', () => {
    expect(extractProcessId('<bpmn:definitions></bpmn:definitions>')).toBeNull();
  });

  it('returns null for empty/garbage input', () => {
    expect(extractProcessId('')).toBeNull();
  });
});
