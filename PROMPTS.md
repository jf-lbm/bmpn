# Claude Code prompts — BPMN Viewer & Editor

Hand these to Claude Code **one phase at a time**. Do not paste all phases at
once — it leads to shortcuts and skipped acceptance criteria.

The repo is already scaffolded: Vite + React + TS + Tailwind config,
`package.json` with the full dependency set, and an empty stub for every file
in the target tree (see `CLAUDE.md`). The job of each phase is to fill the
stubs, not to recreate the tree.

---

## First message to Claude Code

```
Read CLAUDE.md. The project is already scaffolded with stub files and a
package.json. Run `npm install`, then implement Phase 1 exactly as specified
below by filling in the existing stub files. After that, run `npm run dev` and
confirm the canvas renders. Then stop and ask before moving to Phase 2.
```

---

## Phase 1 — MVP viewer

```
Implement Phase 1: a working BPMN viewer. The project is already scaffolded
(Vite + React + TS + Tailwind, deps in package.json, stub files in src/).
Run `npm install` first. Fill in the stubs — do not rebuild the tree.

Acceptance criteria:
- Mount a bpmn-js Modeler in a full-height canvas (header 48px, canvas fills
  the rest).
- On load, display a minimal valid BPMN diagram (start event → task → end
  event).
- File menu with "Open .bpmn" — uses a hidden <input type="file"> and reads
  the file with FileReader.
- Drag-and-drop a .bpmn file anywhere on the window imports it.
- Save button downloads the current diagram as `diagram.bpmn` (file-saver).
- Errors during import surface as a non-blocking toast (build a tiny toast, no
  library).
- No properties panel yet. No editing logic beyond what bpmn-js gives for free.

Things to get right:
- Import the bpmn-js CSS files (see CLAUDE.md).
- Wrap the Modeler in a useEffect that creates it once on mount and destroys
  it on unmount. Do NOT recreate on re-render.
- Type the modeler with `BpmnModeler from 'bpmn-js/lib/Modeler'`.
- Expose `getXml()` via a ref so the toolbar can call it.

Do not skip ahead to the properties panel or PDF export.
```

---

## Phase 2 — Editor features

```
Implement Phase 2 on top of Phase 1. Extend; do not rewrite Phase 1.

Add:
- bpmn-js-properties-panel mounted in a right sidebar (320px, collapsible).
- Undo / Redo buttons wired to the commandStack.
- Zoom in / Zoom out / Fit-to-viewport buttons.
- diagram-js-minimap in the bottom-right corner.
- Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+S (download),
  Ctrl/Cmd+O (open), Delete (delete selection). Attach to window.
- Dirty flag: track `commandStack.changed` events and show a dot on the Save
  button when there are unsaved changes.
- Auto-persist current XML to localStorage on every change (debounced 500ms);
  restore from localStorage on app load if present.
- "New" button: confirm if dirty, then load the empty diagram.

Acceptance criteria:
- Selecting an element shows its properties on the right.
- Renaming a task in the properties panel updates the canvas live.
- Refreshing the browser restores the last diagram.
- All shortcuts work without focusing the canvas first.
```

---

## Phase 3 — Exports & polish

```
Implement Phase 3. Extend; do not rewrite earlier phases.

Export functions in src/lib/exporters/:
- exportBpmn: refactor the Phase 1 download here.
- exportSvg: modeler.saveSVG(), save as .svg.
- exportPng: rasterize the SVG via a hidden <canvas>, save as .png at 2x scale.
- exportPdf: svg2pdf.js + jspdf, fit to A4 landscape, save as .pdf.

Add an Export dropdown in the toolbar with the 4 options.

Polish:
- Dark mode toggle, persisted in localStorage. Override bpmn-js colors via CSS
  variables in bpmn-overrides.css so connections, events, and tasks read well
  on dark.
- Empty-state hint over a blank canvas: "Drop a .bpmn file or start modeling".
- A "Read-only" toggle that swaps the Modeler for bpmn-js NavigatedViewer,
  preserving the current XML across the swap.
- StatusBar at the bottom: element count, zoom %, dirty indicator.

Acceptance criteria:
- All 4 export formats produce valid, openable files.
- Read-only mode hides the palette and properties panel and disables editing.
- Dark mode is visually clean — no white flashes on the canvas.
```

---

## Guardrails — append to every phase prompt

```
Constraints:
- Don't rewrite previous phases. Extend them.
- Don't introduce new dependencies beyond the stack in CLAUDE.md. If you think
  one is needed, stop and ask.
- Never put the Modeler instance in React state — use a useRef. Never depend
  on `modeler` in a useEffect deps array.
- bpmn-js types are imperfect. Prefer `import type` and a commented
  `// @ts-expect-error` over `any` where the library typings are wrong.
- Test the import → edit → export round-trip manually after each phase and
  report any XML loss.
```

---

## Implementation notes (context, not prompts)

- **PDF export**: svg2pdf.js renders bpmn-js SVG well but occasionally chokes
  on the bpmn icon font. If exportPdf fails there, fall back to
  SVG → high-res PNG → jspdf `addImage`. Less crisp but always works.
- **AI later**: ba-copilot likely does text → intermediate JSON → BPMN XML.
  Raw LLM-generated BPMN XML is rarely valid; run a layout engine
  (`bpmn-auto-layout` from bpmn.io) after generation. Out of scope for now.
- **Swimlanes**: bpmn-js supports pools/lanes but they are the most awkward
  elements to manipulate. If they're central to the use case, add a dedicated
  Phase 4; otherwise let users work with the defaults.
- **Versions**: the versions in `package.json` are reasonable ranges, not
  pinned-verified. If `npm install` or `npm run build` fails on a version,
  bump it and keep the bpmn-js / bpmn-js-properties-panel /
  @bpmn-io/properties-panel trio mutually compatible.
