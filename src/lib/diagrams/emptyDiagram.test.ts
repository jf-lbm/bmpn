import { describe, it, expect } from 'vitest';
import { makeEmptyDiagram } from './emptyDiagram';
import { extractProcessId } from '../bpmnXml';

describe('makeEmptyDiagram', () => {
  it('produces a fresh process id on every call', () => {
    const a = extractProcessId(makeEmptyDiagram());
    const b = extractProcessId(makeEmptyDiagram());
    expect(a).toMatch(/^Process_[0-9a-f]{16}$/);
    expect(b).toMatch(/^Process_[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });

  it('wires the BPMNPlane to the generated process id', () => {
    const xml = makeEmptyDiagram();
    const pid = extractProcessId(xml)!;
    expect(xml).toContain(`bpmnElement="${pid}"`);
  });
});
