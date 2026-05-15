# Design — Reusable sub-processes (Call Activity) + org-unique IDs

Date: 2026-05-15
Status: Approved (design); pending spec review
Topic: reusable-subprocess-call-activity

> Repo artifact written in English to match existing repo conventions
> (`CLAUDE.md`, code comments). Discussion happened in French.

## Problem

Two user-reported symptoms that are actually one problem:

1. Every newly created diagram reuses the same hardcoded IDs
   (`Definitions_1`, `Process_1`, `StartEvent_1`) because `EMPTY_DIAGRAM`
   is a literal constant. Within a single BPMN document this is valid
   (`xsd:ID` only requires uniqueness inside one `<bpmn:definitions>`), but
   it makes cross-diagram references ambiguous.
2. The user wants two different process diagrams to be able to call the
   same shared sub-process — a genuine reuse requirement.

These converge: cross-diagram reuse via a BPMN Call Activity references a
process **by id**, so the called process needs an id that is unique across
the organization. The ID cleanup is a prerequisite of the reuse feature,
not a separate goal.

## BPMN compliance contract (non-negotiable core)

- A reusable sub-process is a **standalone top-level `<bpmn:process>`**
  with an `xsd:ID`-valid id that is unique within the org, stored in its
  **own `diagrams` row**, flagged as callable.
- Calling it from another diagram is a
  `<bpmn:callActivity calledElement="<process id>">` in the calling
  diagram's process.
- The embedded `<bpmn:subProcess>` remains available for **non-reusable**
  inline decomposition. It is a distinct construct with a distinct UI
  affordance; it is never used as the reuse mechanism.
- Every exported `.bpmn` stays XSD schema-valid. `calledElement` is a
  by-id reference resolved at deployment time by any compliant BPMN
  engine — identical semantics to Camunda Modeler. No bpmn.io-proprietary
  data is added to the XML. Exported files round-trip with standard BPMN
  tooling.

## A. ID strategy (fixes "always Process_1")

- Replace the `EMPTY_DIAGRAM` constant with a `makeEmptyDiagram()`
  factory that injects fresh ids on every call:
  `Definitions_<rand>`, `Process_<rand>`, `StartEvent_<rand>`.
- `<rand>` = a collision-resistant token: 16 hex characters (64 bits)
  derived from `crypto.randomUUID()`. The id is letter-prefixed
  (`Process_`, etc.) so it is always a valid `xsd:ID`
  (must start with a letter/underscore, no whitespace). Example:
  `Process_a1b2c3d4e5f60718`. 64 bits keeps cross-diagram
  `calledElement` collisions negligible at org scale (no DB check).
- Uniqueness is by construction (UUID entropy) — no DB round-trip needed
  to allocate an id.
- `useBpmnModeler.ts` currently bootstraps from `EMPTY_DIAGRAM`; it must
  bootstrap from a single `makeEmptyDiagram()` call captured once per
  diagram session (not regenerated on every render/mode flip).

## B. Data / schema changes

- `supabase/schema.sql`: add to `public.diagrams`:
  - `process_id text` — the top-level process id parsed from the XML.
  - `is_callable boolean not null default false` — included in the
    Call Activity picker when true.
  - Index on `(org_id, is_callable)` for the picker query.
  - RLS policies are **unchanged** (rows stay org-scoped; only the owner
    deletes).
- `diagramRepository.ts`:
  - On create and on save, write `process_id` and `is_callable`
    (derived from the XML / the callable flag). XML remains the source of
    truth; these columns are a derived index for fast lookup.
  - Add `listCallableProcesses(orgId)` returning callable diagram
    summaries `{ id, name, process_id }` for the picker.
  - Add resolution of a diagram by `process_id` (for drill-in
    navigation).

## C. UX flow

- A "Mark this diagram as reusable" toggle (sidebar/toolbar) sets
  `is_callable` on the current diagram.
- An "Add reusable sub-process (Call Activity)" action:
  - Opens a picker listing the org's callable diagrams.
  - Selecting an existing one inserts a `bpmn:callActivity` with
    `calledElement` set to that process id.
  - "New reusable sub-process" creates a new diagram row (empty,
    `is_callable = true`) and links the new Call Activity to it.
- The Call Activity renders with the referenced process's **name** as its
  label.
- Drill-in: double-clicking a Call Activity opens the referenced diagram
  in the editor (navigation — a Call Activity has no internal content to
  expand; "expand" in BPMN means opening the called process). The editor
  store tracks the current diagram so navigation can resolve and load the
  target.

## D. Out of scope for v1 (YAGNI — explicit)

- **No version pinning.** References are live: editing the shared process
  changes behavior for all callers. Standard and simplest.
- **No automatic extraction** of an existing embedded `subProcess` into a
  reusable process. Can be added later; not required for the core
  mechanism.
- **No self-contained "export with dependencies" bundle** (multiple
  processes in one `<bpmn:definitions>`). Single-file export with a by-id
  reference is already compliant. Possible later enhancement.

## Alternatives considered

- *Shared embedded subProcess by copy* — not BPMN reuse; it is
  duplication that drifts, and is not compliant with the user's intent.
  **Rejected.**
- *Self-contained multi-process export bundle* — more portable offline
  but heavier, and not needed for compliance. **Deferred (not v1).**

## Affected surface

`src/lib/diagrams/emptyDiagram.ts` (constant → factory), a new id util,
`src/lib/diagramRepository.ts`, `supabase/schema.sql`,
`src/hooks/useBpmnModeler.ts` (bootstrap from factory; drill-in nav),
a palette/toolbar entry + a picker UI component (Tailwind only — no new UI
deps, per stack constraints), `src/store/editorStore.ts` (current diagram
+ drill-in navigation state), `src/App.tsx` (wiring).

## Success criteria

- Two distinct diagrams can each contain a Call Activity that references
  the same reusable process; both resolve to the same shared definition.
- Creating N new diagrams yields N distinct top-level process ids.
- Exported `.bpmn` files are XSD-valid and open in Camunda Modeler with
  the Call Activity present and its `calledElement` intact.
- No new runtime dependency added (stack constraint honored).
- Existing diagrams (with `Process_1`) keep working; migration of
  `process_id`/`is_callable` for existing rows is backfilled from XML on
  next save (no destructive migration).
