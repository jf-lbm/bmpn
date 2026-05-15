# Project: BPMN Viewer & Editor

## Goal
A browser-based BPMN 2.0 viewer and editor (built on bpmn.io / `bpmn-js`),
behind authentication, with multi-user organizations. Diagrams are stored in a
database as canonical BPMN 2.0 XML and shared across the members of an
organization. No AI features — a pure modeling tool.

## Core user flows
1. Sign in (Clerk — password / OAuth / SSO) → pick or create an organization
2. See the organization's diagrams in the sidebar
3. Open a diagram → it loads from the DB into the bpmn-js canvas
4. Edit visually: move, resize, connect, label; edit props in the side panel
5. Save → the BPMN XML is written back to the DB row (shared with the org)
6. Import an existing `.bpmn` file (file picker or drag-drop) → new DB diagram
7. Export the current diagram as `.bpmn`, `.svg`, `.png`, or `.pdf`
8. Toggle read-only (NavigatedViewer) vs editor (Modeler) mode
9. Invite teammates / manage the org via Clerk's org UI

## Non-goals (do NOT build)
- Real-time co-editing (cursors, CRDT). Sharing is async: save then reload.
- AI generation from text.
- A custom auth or backend server — Clerk + Supabase are the backend.

## Stack (do not deviate — stop and ask before adding a dependency)
- Vite + React 18 + TypeScript (strict mode on)
- Tailwind CSS for layout/UI chrome only — bpmn-js styles its own canvas
- bpmn-js — `Modeler` for editing, `NavigatedViewer` for read-only mode
- bpmn-js-properties-panel + @bpmn-io/properties-panel for the right panel
- diagram-js-minimap for the minimap
- file-saver for downloads; svg2pdf.js + jspdf for PDF export
- zustand for app/editor state
- lucide-react for icons
- @clerk/clerk-react — auth, organizations, member invitations, SSO
- @supabase/supabase-js — Postgres storage of the BPMN XML
- vitest — dev-only unit tests for pure logic (added with explicit user approval; the only stack deviation, zero runtime impact)

No other UI libraries (no shadcn, no MUI, no Radix).

## Data model
Single table `public.diagrams` (see `supabase/schema.sql`): `id`, `org_id`
(Clerk org), `owner_id` (Clerk user), `name`, `bpmn_xml` (the canonical BPMN
2.0 XML — the DB is the source of truth), `created_at`, `updated_at`. Row
Level Security scopes every row to its Clerk organization; only the owner can
delete. The DB stores nothing bpmn.io-specific — exported `.bpmn` round-trips
with any standard BPMN tool.

Reusable sub-processes: a diagram with `is_callable = true` is referenced
by other diagrams via a standard `bpmn:callActivity` whose `calledElement`
is the reusable diagram's top-level process id. `process_id` is a derived
index of that id; the BPMN XML remains the source of truth and round-trips
with standard BPMN tooling.

## Project structure
```
src/
  main.tsx                 # ClerkProvider + root render (no StrictMode)
  App.tsx                  # auth/org gating + workspace orchestration
  components/
    Toolbar.tsx            # New / Import / Save / Export / Undo / Redo / Zoom / mode / theme
    BpmnCanvas.tsx         # Hosts bpmn-js, empty-state hint
    PropertiesPanel.tsx    # Collapsible right panel (edit mode only)
    StatusBar.tsx          # Element count, zoom %, dirty/saved
    FileDropZone.tsx       # Window-wide .bpmn drag-drop overlay
    DiagramSidebar.tsx     # Per-org diagram list (open / new / delete)
    CallActivityPicker.tsx # Pick/create a reusable sub-process to call
  hooks/
    useBpmnModeler.ts      # bpmn-js lifecycle, API, event bus, mode swap
    useKeyboardShortcuts.ts# Ctrl/Cmd+S save, Ctrl/Cmd+O import
    useLocalStoragePersistence.ts # remembers last-opened diagram id per org
  lib/
    supabase.ts            # Supabase client authed with the Clerk token
    diagramRepository.ts   # CRUD over the diagrams table
    ids.ts                 # bpmnId — org-unique xsd:ID-valid element ids
    bpmnXml.ts             # extractProcessId — derive process_id from XML
    exporters/             # exportBpmn / exportSvg / exportPng / exportPdf / util
    diagrams/emptyDiagram.ts
  store/editorStore.ts     # zustand: diagram id/name, dirty, saving, mode, ui
  styles/                  # index.css (Tailwind), bpmn-overrides.css (dark)
  types/shims.d.ts         # ambient decls for untyped bpmn.io modules
supabase/schema.sql        # table + RLS + updated_at trigger
.env.example               # required env vars
```

## External setup (required to run)
1. `npm install`, then copy `.env.example` → `.env.local` and fill the three
   `VITE_` vars.
2. Clerk dashboard: enable **Organizations**; configure SSO/OAuth connections
   as desired (no code change — `bpmn-js` UI is unchanged).
3. Supabase: run `supabase/schema.sql`. Wire Clerk as a third-party auth
   provider (Clerk → Integrations → Supabase; Supabase → Authentication →
   Third-party Auth). Confirm the org-id JWT claim name and adjust the RLS
   policies in `schema.sql` if it isn't `org_id`.

## Key constraints
- bpmn-js is side-effect-heavy. The instance lives in the `useBpmnModeler`
  effect, never in React state. It is rebuilt only when edit/view mode flips.
- `main.tsx` does not use `React.StrictMode` — its double-invoked effects
  double-mount the canvas.
- The DB is the source of truth for diagram XML; localStorage only remembers
  which diagram to reopen.
- bpmn-js types are imperfect — `useBpmnModeler` uses one documented cast and
  minimal local interfaces instead of `any` sprinkled everywhere.

## Commands
- `npm install`
- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm test` — Vitest unit suite (pure logic: ids, bpmnXml, emptyDiagram, repo payload)
- `npm run preview` — preview the production build

## Verification status
Typechecks and builds clean. Runtime is **not** verified here: it needs real
Clerk + Supabase keys and a browser, which this environment lacks.
Unit-tested with Vitest: bpmnId, extractProcessId, makeEmptyDiagram, and the
diagram insert-payload builder. bpmn-js / React / Supabase integration is
gated by typecheck + build (no DOM/browser harness); see the plan's manual
verification checklist for runtime checks the operator must perform.
