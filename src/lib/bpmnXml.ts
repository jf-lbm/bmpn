/**
 * Extracts the first top-level `<…:process id="…">` id from BPMN XML.
 * Tolerates any/no namespace prefix and attribute order. Used only to
 * populate the derived `process_id` index column — the XML itself stays
 * the source of truth, so a regex (not a full parser) is sufficient.
 */
export function extractProcessId(xml: string): string | null {
  const m = xml.match(
    /<(?:[A-Za-z_][\w.-]*:)?process\b[^>]*?\bid\s*=\s*"([^"]+)"/i,
  );
  return m ? m[1] : null;
}
