# Status & follow-ups

This started as a phased prompt plan; the editor is now **implemented**, with
auth + org + DB added on top. This file tracks what's done and what's left.

## Implemented
- bpmn-js editor: canvas, palette, properties panel, minimap, undo/redo,
  zoom/fit, keyboard shortcuts, read-only (NavigatedViewer) toggle, dark mode.
- Import `.bpmn` (file picker + window drag-drop) → new DB diagram.
- Export `.bpmn`, `.svg`, `.png` (2x), `.pdf` (svg2pdf, PNG fallback).
- Clerk auth gate + organization gate + member management via Clerk UI.
- Supabase `diagrams` table stores the canonical BPMN XML; per-org RLS.
- Per-org diagram sidebar (open / new / delete), inline rename, save to DB,
  reopen-last-diagram on reload.

## Required external setup
See `CLAUDE.md` → "External setup". Without Clerk + Supabase keys the app
renders a configuration banner instead of the editor.

## Known caveats
- Runtime is unverified in CI (no keys, no browser). Code typechecks/builds.
- The RLS policies assume the Clerk org id arrives as the `org_id` JWT claim;
  verify against your Clerk JWT template and adjust `supabase/schema.sql`.
- Sharing is async (save → others reload). No live co-editing by design.
- `svg2pdf` can choke on the bpmn icon font; `doExport` already falls back to
  a high-res PNG.

## Possible follow-ups (not started)
- Optimistic/last-writer-wins conflict handling on concurrent saves.
- Autosave on a debounce instead of explicit Save.
- Diagram search / folders / per-diagram permissions beyond org scope.
- Code-split the bundle (build warns it's > 500 kB).
- AI text → BPMN (would need an intermediate JSON + `bpmn-auto-layout`).
