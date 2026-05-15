/**
 * Extracts the first top-level `<…:process id="…">` id from BPMN XML.
 * Tolerates any/no namespace prefix and attribute order. Used only to
 * populate the derived `process_id` index column — the XML itself stays
 * the source of truth, so a regex (not a full parser) is sufficient.
 *
 * Only double-quoted `id` attributes are matched. bpmn-js always emits
 * double quotes; a single-quoted third-party file yields `null` here,
 * which is acceptable for a derived index (it backfills on next save).
 */
export function extractProcessId(xml: string): string | null {
  // `i` flag is intentional belt-and-suspenders; BPMN element names are
  // always lowercase `process`, but matching case-insensitively is harmless.
  const m = xml.match(
    /<(?:[A-Za-z_][\w.-]*:)?process\b[^>]*?\bid\s*=\s*"([^"]+)"/i,
  );
  return m ? m[1] : null;
}
