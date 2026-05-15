# Project: BPMN Viewer & Editor

## Goal
A browser-based BPMN 2.0 viewer and editor inspired by ba-copilot.com's free
editor. No AI features — a pure modeling tool. No install required for end
users; it runs entirely in the browser.

## Core user flows
1. Open the app → blank canvas, ready to model
2. Drag elements from a palette onto the canvas
3. Import an existing `.bpmn` file (drag-drop or file picker)
4. Edit visually: move, resize, connect, label elements
5. Edit element properties in a side panel
6. Export as `.bpmn` (XML), `.svg`, `.png`, or `.pdf`
7. Diagram persists in `localStorage` between sessions
8. Toggle viewer-only mode (read-only) vs editor mode

## Non-goals (do NOT build)
- Authentication, accounts, backend
- Real-time collaboration
- AI generation from text
- Server-side persistence

## Stack (do not deviate — stop and ask before adding a dependency)
- Vite + React 18 + TypeScript (strict mode on)
- Tailwind CSS for layout/UI chrome only — bpmn-js styles its own canvas
- bpmn-js — `Modeler` for editing, `NavigatedViewer` for read-only mode
- bpmn-js-properties-panel + @bpmn-io/properties-panel for the right panel
- diagram-js-minimap for the minimap
- file-saver for downloads
- svg2pdf.js + jspdf for PDF export from the SVG bpmn-js emits
- zustand for app state (current XML, dirty flag, mode)
- lucide-react for icons

No other UI libraries (no shadcn, no MUI, no Radix).

## Project structure
```
src/
  main.tsx
  App.tsx
  components/
    Toolbar.tsx          # New / Open / Save / Export / Undo / Redo / Zoom
    BpmnCanvas.tsx       # Hosts the bpmn-js Modeler
    PropertiesPanel.tsx  # Right side, collapsible
    StatusBar.tsx        # Element count, dirty indicator, zoom %
    FileDropZone.tsx     # Drag-and-drop overlay
  hooks/
    useBpmnModeler.ts    # Lifecycle, import/export, event bus
    useKeyboardShortcuts.ts
    useLocalStoragePersistence.ts
  lib/
    exporters/
      exportSvg.ts
      exportPng.ts
      exportPdf.ts
      exportBpmn.ts
    diagrams/
      emptyDiagram.ts    # Minimal valid BPMN XML for "New"
  store/
    editorStore.ts       # zustand: xml, isDirty, mode, lastSavedAt
  styles/
    index.css            # Tailwind entry
    bpmn-overrides.css    # Light/dark theming on top of bpmn-js defaults
```

The scaffold and an empty stub for each file above already exist. Implement
the phases (see `PROMPTS.md`) by filling in the stubs — do not rebuild the
tree from scratch.

## Key constraints
- bpmn-js is a side-effect-heavy library. Never store the Modeler instance in
  React state — use a `useRef`. Never put `modeler` in a `useEffect` deps array.
- Create the Modeler once on mount, destroy it on unmount. Do not recreate it
  on re-render. (`main.tsx` does not use `React.StrictMode` for this reason —
  its double-invoked effects double-mount the canvas.)
- Import the bpmn-js CSS: `bpmn-js/dist/assets/diagram-js.css`,
  `bpmn-js/dist/assets/bpmn-js.css`,
  `bpmn-js/dist/assets/bpmn-font/css/bpmn.css`.
- bpmn-js types are imperfect — prefer `import type` and a commented
  `// @ts-expect-error` over `any` where the library typings are wrong.
- Build phases incrementally; never rewrite a prior phase, only extend it.
- After each phase, manually test the import → edit → export round-trip and
  report any XML loss.

## Commands
- `npm install` — first, before anything (deps are declared but not vendored)
- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run preview` — preview the production build
