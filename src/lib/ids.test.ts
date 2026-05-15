import { describe, it, expect } from 'vitest';
import { bpmnId } from './ids';

describe('bpmnId', () => {
  it('prefixes with the given name and a separator', () => {
    expect(bpmnId('Process')).toMatch(/^Process_[0-9a-f]{16}$/);
  });

  it('is a valid xsd:ID (NCName: starts with a letter/underscore, no spaces)', () => {
    const id = bpmnId('Definitions');
    expect(id).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
  });

  it('is collision-resistant across many calls', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => bpmnId('X')));
    expect(ids.size).toBe(5000);
  });
});
