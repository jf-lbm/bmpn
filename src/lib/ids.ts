/**
 * Generates a BPMN element id of the form `Prefix_xxxxxxxxxxxxxxxx`, where
 * the suffix is 16 hex characters (64 bits) of UUID entropy. Unique across
 * the org by construction (no DB round-trip): at 64 bits, collision is
 * negligible even across tens of thousands of ids. The leading letter
 * prefix keeps it a valid `xsd:ID` (NCName: must not start with a digit,
 * no whitespace). `prefix` itself must be NCName-safe (caller's
 * responsibility — all call sites pass hardcoded safe literals).
 */
export function bpmnId(prefix: string): string {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `${prefix}_${hex}`;
}
