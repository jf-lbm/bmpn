// Untyped bpmn.io modules — sanctioned `any` per CLAUDE.md guardrail.
declare module 'diagram-js-minimap' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const minimapModule: any;
  export default minimapModule;
}

declare module 'bpmn-js-properties-panel' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BpmnPropertiesPanelModule: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BpmnPropertiesProviderModule: any;
}
