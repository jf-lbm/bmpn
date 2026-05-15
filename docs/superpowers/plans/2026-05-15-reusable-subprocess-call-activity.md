# Reusable Sub-processes (Call Activity) + Org-unique IDs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any org diagram reference a shared reusable process via a standard BPMN `callActivity`, and stop every new diagram from reusing the hardcoded `Process_1` id.

**Architecture:** A reusable sub-process is a normal `diagrams` row flagged `is_callable`, whose top-level `<bpmn:process>` has an org-unique id. Other diagrams call it with `<bpmn:callActivity calledElement="<that id>">`. Pure logic (id generation, `process_id` extraction, insert-payload building) is built test-first with Vitest; bpmn-js / React / Supabase integration is gated on `npm run build` (the project's `tsc -b` typecheck + Vite build) plus explicit manual verification, because the project has no DOM/jsdom test harness and adding one is out of scope.

**Tech Stack:** Vite + React 18 + TypeScript (strict), bpmn-js 17, zustand, Supabase, Clerk, Tailwind, lucide-react. **New (user-approved) devDependency: `vitest`.**

---

## File Structure

**Created:**
- `src/lib/ids.ts` — `bpmnId(prefix)`: org-unique, `xsd:ID`-valid element id. Pure.
- `src/lib/ids.test.ts` — Vitest unit tests for `bpmnId`.
- `src/lib/bpmnXml.ts` — `extractProcessId(xml)`: first top-level process id, or `null`. Pure.
- `src/lib/bpmnXml.test.ts` — Vitest unit tests for `extractProcessId`.
- `src/lib/diagrams/emptyDiagram.test.ts` — Vitest test for the factory.
- `src/lib/diagramRepository.test.ts` — Vitest test for the pure insert-payload builder.
- `src/components/CallActivityPicker.tsx` — modal: pick an existing callable diagram or create a new one.

**Modified:**
- `package.json` — add `vitest` devDep + `test` script.
- `vite.config.ts` — add Vitest `test` block.
- `src/lib/diagrams/emptyDiagram.ts` — constant → `makeEmptyDiagram()` factory.
- `src/lib/diagramRepository.ts` — `process_id`/`is_callable` columns; payload builder; callable selectors.
- `supabase/schema.sql` — add the two columns + index (idempotent).
- `src/hooks/useBpmnModeler.ts` — bootstrap via factory; `insertCallActivity`; call-activity double-click handler.
- `src/App.tsx` — `makeEmptyDiagram()` on create; picker wiring; drill-in; toggle callable.
- `src/components/Toolbar.tsx` — "Sub-process" button + "Reusable" toggle.
- `src/components/DiagramSidebar.tsx` — callable badge.
- `CLAUDE.md` — document Vitest, new files, `npm test`, the feature.

---

## Task 1: Add Vitest tooling

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Test: `src/lib/smoke.test.ts` (temporary, deleted in this task)

- [ ] **Step 1: Add the devDependency and script**

Edit `package.json`. Add a `test` script under `"scripts"` (after `"preview"`):

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

Add `"vitest": "^2.1.8"` to `devDependencies` (keep the object alphabetically consistent with the existing entries — place it after `"typescript"`):

```json
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes; `node_modules/vitest` exists.

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the entire file with:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

(`vitest/config` re-exports Vite's `defineConfig` with the `test` field typed, so the Vite build is unaffected.)

- [ ] **Step 4: Write a smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 6: Confirm the production build still typechecks**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 7: Delete the smoke test**

Run: `rm src/lib/smoke.test.ts`

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: add Vitest (dev-only) for pure-logic unit tests"
```

---

## Task 2: `bpmnId` — org-unique, xsd:ID-valid element ids

**Files:**
- Create: `src/lib/ids.ts`
- Test: `src/lib/ids.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ids.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ids`
Expected: FAIL — cannot resolve `./ids`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ids.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ids`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ids.ts src/lib/ids.test.ts
git commit -m "feat: bpmnId — org-unique xsd:ID-valid element ids"
```

---

## Task 3: `extractProcessId` — read the top-level process id from XML

**Files:**
- Create: `src/lib/bpmnXml.ts`
- Test: `src/lib/bpmnXml.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/bpmnXml.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractProcessId } from './bpmnXml';

describe('extractProcessId', () => {
  it('reads a prefixed bpmn:process id', () => {
    const xml =
      '<bpmn:definitions><bpmn:process id="Process_a1b2c3d4" isExecutable="false"/></bpmn:definitions>';
    expect(extractProcessId(xml)).toBe('Process_a1b2c3d4');
  });

  it('reads a default-namespace process id', () => {
    const xml = '<definitions>\n  <process id="P_1">\n  </process>\n</definitions>';
    expect(extractProcessId(xml)).toBe('P_1');
  });

  it('returns the first process when several exist', () => {
    const xml =
      '<x><bpmn:process id="First"/><bpmn:process id="Second"/></x>';
    expect(extractProcessId(xml)).toBe('First');
  });

  it('returns null when there is no process', () => {
    expect(extractProcessId('<bpmn:definitions></bpmn:definitions>')).toBeNull();
  });

  it('returns null for empty/garbage input', () => {
    expect(extractProcessId('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bpmnXml`
Expected: FAIL — cannot resolve `./bpmnXml`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/bpmnXml.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bpmnXml`
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bpmnXml.ts src/lib/bpmnXml.test.ts
git commit -m "feat: extractProcessId — derive process_id from BPMN XML"
```

---

## Task 4: `makeEmptyDiagram()` factory + update importers

**Files:**
- Modify: `src/lib/diagrams/emptyDiagram.ts`
- Test: `src/lib/diagrams/emptyDiagram.test.ts`
- Modify: `src/App.tsx:25`, `src/App.tsx:180`
- Modify: `src/hooks/useBpmnModeler.ts:16`, `src/hooks/useBpmnModeler.ts:80`

- [ ] **Step 1: Write the failing test**

Create `src/lib/diagrams/emptyDiagram.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeEmptyDiagram } from './emptyDiagram';
import { extractProcessId } from '../bpmnXml';

describe('makeEmptyDiagram', () => {
  it('produces a fresh process id on every call', () => {
    const a = extractProcessId(makeEmptyDiagram());
    const b = extractProcessId(makeEmptyDiagram());
    expect(a).toMatch(/^Process_[0-9a-f]{16}$/);
    expect(b).toMatch(/^Process_[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });

  it('wires the BPMNPlane to the generated process id', () => {
    const xml = makeEmptyDiagram();
    const pid = extractProcessId(xml)!;
    expect(xml).toContain(`bpmnElement="${pid}"`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- emptyDiagram`
Expected: FAIL — `makeEmptyDiagram` is not exported.

- [ ] **Step 3: Replace the constant with a factory**

Replace the entire contents of `src/lib/diagrams/emptyDiagram.ts` with:

```ts
import { bpmnId } from '../ids';

/**
 * Builds an empty BPMN 2.0 diagram with freshly generated, org-unique
 * ids. Call this per new diagram — never reuse one string, or every
 * diagram in the org would share `Process_1` and cross-diagram
 * `calledElement` references would be ambiguous.
 */
export function makeEmptyDiagram(): string {
  const defs = bpmnId('Definitions');
  const proc = bpmnId('Process');
  const start = bpmnId('StartEvent');
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="${defs}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${proc}" isExecutable="false">
    <bpmn:startEvent id="${start}" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${proc}">
      <bpmndi:BPMNShape id="${start}_di" bpmnElement="${start}">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- emptyDiagram`
Expected: PASS — 2 passed.

- [ ] **Step 5: Update the App.tsx importer**

In `src/App.tsx` line 25, replace:

```ts
import { EMPTY_DIAGRAM } from './lib/diagrams/emptyDiagram';
```

with:

```ts
import { makeEmptyDiagram } from './lib/diagrams/emptyDiagram';
```

In `src/App.tsx` `createNew` (around line 180), replace `bpmnXml: EMPTY_DIAGRAM,` with:

```ts
        bpmnXml: makeEmptyDiagram(),
```

- [ ] **Step 6: Update the useBpmnModeler bootstrap**

In `src/hooks/useBpmnModeler.ts` line 16, replace:

```ts
import { EMPTY_DIAGRAM } from '../lib/diagrams/emptyDiagram';
```

with:

```ts
import { makeEmptyDiagram } from '../lib/diagrams/emptyDiagram';
```

In `src/hooks/useBpmnModeler.ts`, replace line 80:

```ts
  const xmlRef = useRef<string>(EMPTY_DIAGRAM);
```

with (lazily generate once per hook instance, not per render):

```ts
  const xmlRef = useRef<string>('');
  if (!xmlRef.current) xmlRef.current = makeEmptyDiagram();
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors (no remaining references to `EMPTY_DIAGRAM`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/diagrams/emptyDiagram.ts src/lib/diagrams/emptyDiagram.test.ts src/App.tsx src/hooks/useBpmnModeler.ts
git commit -m "feat: makeEmptyDiagram factory — unique ids per new diagram"
```

---

## Task 5: Schema — add `process_id` and `is_callable`

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add the columns and index (idempotent)**

In `supabase/schema.sql`, after the `create table … public.diagrams (…);` block and before the existing `create index … diagrams_org_id_idx …` line (i.e. after line 20), insert:

```sql
-- Reusable-sub-process support. process_id mirrors the top-level
-- <bpmn:process> id from bpmn_xml (XML stays source of truth; this is a
-- derived lookup index). is_callable marks a diagram as a reusable
-- process other diagrams may reference via callActivity/calledElement.
alter table public.diagrams
  add column if not exists process_id  text;
alter table public.diagrams
  add column if not exists is_callable boolean not null default false;

create index if not exists diagrams_callable_idx
  on public.diagrams (org_id, is_callable);
```

RLS policies are intentionally left unchanged — rows stay org-scoped.

- [ ] **Step 2: Sanity-check the SQL parses (no DB needed)**

Run: `grep -n "add column if not exists" supabase/schema.sql`
Expected: two matches (`process_id`, `is_callable`).

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): add process_id + is_callable to diagrams"
```

> Note for the operator: this SQL must be run against the live Supabase
> project (it is idempotent and safe to re-run). Existing rows get
> `process_id = NULL` until their next save (backfilled in Task 6).

---

## Task 6: Repository — columns, payload builder, callable selectors

**Files:**
- Modify: `src/lib/diagramRepository.ts`
- Test: `src/lib/diagramRepository.test.ts`

- [ ] **Step 1: Write the failing test for the pure payload builder**

Create `src/lib/diagramRepository.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDiagramInsert } from './diagramRepository';

describe('buildDiagramInsert', () => {
  it('derives process_id from the xml and defaults is_callable to false', () => {
    const row = buildDiagramInsert({
      orgId: 'org_1',
      ownerId: 'user_1',
      name: 'Untitled',
      bpmnXml: '<bpmn:process id="Process_dead0001"/>',
    });
    expect(row).toEqual({
      org_id: 'org_1',
      owner_id: 'user_1',
      name: 'Untitled',
      bpmn_xml: '<bpmn:process id="Process_dead0001"/>',
      process_id: 'Process_dead0001',
      is_callable: false,
    });
  });

  it('honors an explicit is_callable flag', () => {
    const row = buildDiagramInsert({
      orgId: 'o',
      ownerId: 'u',
      name: 'Lib',
      bpmnXml: '<process id="P"/>',
      isCallable: true,
    });
    expect(row.is_callable).toBe(true);
    expect(row.process_id).toBe('P');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- diagramRepository`
Expected: FAIL — `buildDiagramInsert` is not exported.

- [ ] **Step 3: Implement the repository changes**

In `src/lib/diagramRepository.ts`, replace lines 1–15 (imports, `DiagramRow`, `DiagramSummary`, `SUMMARY_COLS`) with:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractProcessId } from './bpmnXml';

export interface DiagramRow {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  bpmn_xml: string;
  process_id: string | null;
  is_callable: boolean;
  created_at: string;
  updated_at: string;
}

export type DiagramSummary = Omit<DiagramRow, 'bpmn_xml'>;

const SUMMARY_COLS =
  'id, org_id, owner_id, name, process_id, is_callable, created_at, updated_at';

export interface DiagramInsertInput {
  orgId: string;
  ownerId: string;
  name: string;
  bpmnXml: string;
  isCallable?: boolean;
}

interface DiagramInsertRow {
  org_id: string;
  owner_id: string;
  name: string;
  bpmn_xml: string;
  process_id: string | null;
  is_callable: boolean;
}

/** Pure: builds the DB insert payload, deriving the derived columns. */
export function buildDiagramInsert(
  input: DiagramInsertInput,
): DiagramInsertRow {
  return {
    org_id: input.orgId,
    owner_id: input.ownerId,
    name: input.name,
    bpmn_xml: input.bpmnXml,
    process_id: extractProcessId(input.bpmnXml),
    is_callable: input.isCallable ?? false,
  };
}
```

In the same file, replace the existing `createDiagram` function (the `export async function createDiagram(… ) { … }` block) with:

```ts
export async function createDiagram(
  db: SupabaseClient,
  input: DiagramInsertInput,
): Promise<DiagramRow> {
  const { data, error } = await db
    .from('diagrams')
    .insert(buildDiagramInsert(input))
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as DiagramRow;
}
```

Replace the existing `updateDiagramXml` function with (also refreshes `process_id`, backfilling legacy rows on save):

```ts
export async function updateDiagramXml(
  db: SupabaseClient,
  id: string,
  bpmnXml: string,
): Promise<void> {
  const { error } = await db
    .from('diagrams')
    .update({ bpmn_xml: bpmnXml, process_id: extractProcessId(bpmnXml) })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
```

At the end of the file, append:

```ts
/** Callable diagrams in the active org (RLS scopes to org), for the picker. */
export async function listCallableProcesses(
  db: SupabaseClient,
): Promise<DiagramSummary[]> {
  const { data, error } = await db
    .from('diagrams')
    .select(SUMMARY_COLS)
    .eq('is_callable', true)
    .not('process_id', 'is', null)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DiagramSummary[];
}

/** Resolves a diagram by its top-level process id (for call-activity drill-in). */
export async function getDiagramByProcessId(
  db: SupabaseClient,
  processId: string,
): Promise<DiagramSummary | null> {
  const { data, error } = await db
    .from('diagrams')
    .select(SUMMARY_COLS)
    .eq('process_id', processId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DiagramSummary | null) ?? null;
}

/** Flips the reusable flag on one diagram. */
export async function setDiagramCallable(
  db: SupabaseClient,
  id: string,
  isCallable: boolean,
): Promise<void> {
  const { error } = await db
    .from('diagrams')
    .update({ is_callable: isCallable })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- diagramRepository`
Expected: PASS — 2 passed.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/diagramRepository.ts src/lib/diagramRepository.test.ts
git commit -m "feat(repo): process_id/is_callable columns + callable selectors"
```

---

## Task 7: bpmn-js API — insert a Call Activity + drill-in on double-click

**Files:**
- Modify: `src/hooks/useBpmnModeler.ts`

No automated test (bpmn-js needs a real DOM the project does not harness). Gate: `npm run build` + manual verification.

- [ ] **Step 1: Extend the `BpmnApi` interface**

In `src/hooks/useBpmnModeler.ts`, in the `export interface BpmnApi { … }` block, add these two members after `fit: () => void;`:

```ts
  insertCallActivity: (opts: { calledElement: string; name: string }) => void;
  setCallActivityOpenHandler: (
    fn: ((calledElement: string) => void) | null,
  ) => void;
```

- [ ] **Step 2: Extend the typed service wrappers**

Replace the existing `interface CanvasSvc { … }` block with:

```ts
interface CanvasSvc {
  zoom: (level?: number | string, center?: unknown) => number;
  viewbox: () => { x: number; y: number; width: number; height: number };
  getRootElement: () => unknown;
}
interface ElementFactorySvc {
  createShape: (attrs: { type: string }) => unknown;
}
interface ModelingSvc {
  createShape: (
    shape: unknown,
    position: { x: number; y: number },
    target: unknown,
  ) => unknown;
  updateProperties: (
    element: unknown,
    props: Record<string, unknown>,
  ) => void;
}
interface DblClickEvent {
  element?: { businessObject?: { $type?: string; calledElement?: string } };
}
```

- [ ] **Step 3: Add a handler ref at hook scope**

In `useBpmnModeler`, immediately after the line `const xmlRef = useRef<string>('');` (and its `if (!xmlRef.current) …` line from Task 4), add:

```ts
  const openHandlerRef = useRef<((calledElement: string) => void) | null>(
    null,
  );
```

- [ ] **Step 4: Subscribe to double-click inside the effect**

In `src/hooks/useBpmnModeler.ts`, find the existing line:

```ts
    bus.on('canvas.viewbox.changed', syncZoom);
```

Immediately after it, add:

```ts
    bus.on('element.dblclick', (e?: unknown) => {
      const bo = (e as DblClickEvent | undefined)?.element?.businessObject;
      if (bo?.$type === 'bpmn:CallActivity' && bo.calledElement) {
        openHandlerRef.current?.(bo.calledElement);
      }
    });
```

- [ ] **Step 5: Implement the two new API methods**

In the `const api: BpmnApi = { … }` object, after `fit,` add:

```ts
      insertCallActivity: ({ calledElement, name }) => {
        if (mode !== 'edit') return;
        const canvas = inst.get<CanvasSvc>('canvas');
        const elementFactory = inst.get<ElementFactorySvc>('elementFactory');
        const modeling = inst.get<ModelingSvc>('modeling');
        const vb = canvas.viewbox();
        const shape = elementFactory.createShape({
          type: 'bpmn:CallActivity',
        });
        const created = modeling.createShape(
          shape,
          { x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 },
          canvas.getRootElement(),
        );
        modeling.updateProperties(created, { calledElement, name });
      },
      setCallActivityOpenHandler: (fn) => {
        openHandlerRef.current = fn;
      },
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 7: Manual verification (record result in the commit body)**

With `npm run dev` running and a diagram open in edit mode:
- Open the browser console and run, against the live api, that no error is thrown when the methods are referenced (full UI exercised in Task 9). At minimum confirm the app still loads, a diagram renders, and switching edit/view still works (the effect was modified).

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useBpmnModeler.ts
git commit -m "feat(bpmn): insertCallActivity + call-activity dblclick drill-in hook"
```

---

## Task 8: `CallActivityPicker` component

**Files:**
- Create: `src/components/CallActivityPicker.tsx`

Tailwind + lucide only (stack constraint: no new UI libs). Gate: `npm run build` + manual.

- [ ] **Step 1: Create the component**

Create `src/components/CallActivityPicker.tsx`:

```tsx
import { Boxes, Plus, X } from 'lucide-react';
import type { DiagramSummary } from '../lib/diagramRepository';

export default function CallActivityPicker({
  open,
  callables,
  onPick,
  onCreateNew,
  onClose,
}: {
  open: boolean;
  callables: DiagramSummary[];
  onPick: (processId: string, name: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-96 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Insert reusable sub-process
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={onCreateNew}
          className="mb-3 flex w-full items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Plus size={16} /> New reusable sub-process
        </button>

        <ul className="max-h-72 overflow-auto">
          {callables.length === 0 && (
            <li className="px-2 py-3 text-xs text-slate-400">
              No reusable sub-processes yet. Mark a diagram "Reusable" to make
              it callable.
            </li>
          )}
          {callables.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onPick(c.process_id as string, c.name)}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                title={c.process_id ?? ''}
              >
                <Boxes size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CallActivityPicker.tsx
git commit -m "feat(ui): CallActivityPicker modal"
```

---

## Task 9: App wiring — picker, drill-in, toggle callable

**Files:**
- Modify: `src/App.tsx`

Gate: `npm run build` + manual.

- [ ] **Step 1: Add imports**

In `src/App.tsx`, extend the `diagramRepository` import (currently lines 30–38) to add the new functions, and add the picker import. After the existing `import { … } from './lib/diagramRepository';` block, the import list must include `listCallableProcesses`, `getDiagramByProcessId`, `setDiagramCallable`. Replace the block:

```ts
import {
  createDiagram,
  deleteDiagram,
  getDiagram,
  listDiagrams,
  renameDiagram,
  updateDiagramXml,
  type DiagramSummary,
} from './lib/diagramRepository';
```

with:

```ts
import {
  createDiagram,
  deleteDiagram,
  getDiagram,
  getDiagramByProcessId,
  listCallableProcesses,
  listDiagrams,
  renameDiagram,
  setDiagramCallable,
  updateDiagramXml,
  type DiagramSummary,
} from './lib/diagramRepository';
```

Add after the `import DiagramSidebar …` line:

```ts
import CallActivityPicker from './components/CallActivityPicker';
```

- [ ] **Step 2: Add picker + callable state in `Workspace`**

In `Workspace`, immediately after `const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);`, add:

```ts
  const [pickerOpen, setPickerOpen] = useState(false);
  const [callables, setCallables] = useState<DiagramSummary[]>([]);

  const currentRow = diagrams.find((d) => d.id === diagramId) ?? null;
  const isCurrentCallable = currentRow?.is_callable ?? false;
```

- [ ] **Step 3: Wire the call-activity drill-in handler once the api exists**

In `Workspace`, after the existing `useKeyboardShortcuts({ onSave: save, onOpen: onImportClick });` line, add:

```ts
  const openByProcessId = useCallback(
    async (processId: string) => {
      if (!db) return;
      try {
        const target = await getDiagramByProcessId(db, processId);
        if (!target) {
          notify('Referenced sub-process not found in this organization.');
          return;
        }
        await open(target.id);
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, open, notify],
  );

  useEffect(() => {
    let active = true;
    void waitForApi(apiRef).then((api) => {
      if (active) api.setCallActivityOpenHandler((pid) => void openByProcessId(pid));
    });
    return () => {
      active = false;
    };
  }, [openByProcessId]);
```

- [ ] **Step 4: Add the "open picker" + "create reusable" + "toggle callable" handlers**

In `Workspace`, after `openByProcessId` (and its effect), add:

```ts
  const openCallActivityPicker = useCallback(async () => {
    if (!db) return;
    try {
      setCallables(await listCallableProcesses(db));
      setPickerOpen(true);
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, notify]);

  const pickCallable = useCallback(
    (processId: string, name: string) => {
      setPickerOpen(false);
      apiRef.current?.insertCallActivity({ calledElement: processId, name });
    },
    [],
  );

  const createReusable = useCallback(async () => {
    if (!db || !userId) return;
    try {
      const row = await createDiagram(db, {
        orgId,
        ownerId: userId,
        name: 'Reusable sub-process',
        bpmnXml: makeEmptyDiagram(),
        isCallable: true,
      });
      await refresh();
      setPickerOpen(false);
      if (row.process_id) {
        apiRef.current?.insertCallActivity({
          calledElement: row.process_id,
          name: row.name,
        });
      }
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, userId, orgId, refresh, notify]);

  const toggleCurrentCallable = useCallback(async () => {
    const id = useEditorStore.getState().diagramId;
    if (!db || !id) {
      notify('Save the diagram first, then mark it reusable.');
      return;
    }
    try {
      await setDiagramCallable(db, id, !isCurrentCallable);
      await refresh();
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, isCurrentCallable, refresh, notify]);
```

- [ ] **Step 5: Pass the new props to `Toolbar`**

Replace the existing `<Toolbar … />` element with:

```tsx
      <Toolbar
        apiRef={apiRef}
        onNew={createNew}
        onSave={save}
        onImportClick={onImportClick}
        onExport={doExport}
        onAddCallActivity={() => void openCallActivityPicker()}
        onToggleCallable={() => void toggleCurrentCallable()}
        isCallable={isCurrentCallable}
      />
```

- [ ] **Step 6: Render the picker**

Immediately before the closing `</div>` that ends the `Workspace` return (right after the toasts block `<div className="pointer-events-none …">…</div>`), add:

```tsx
      <CallActivityPicker
        open={pickerOpen}
        callables={callables}
        onPick={pickCallable}
        onCreateNew={() => void createReusable()}
        onClose={() => setPickerOpen(false)}
      />
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors. (Toolbar prop types land in Task 10 — if the build fails only on the three new Toolbar props, proceed to Task 10 then re-run; do not "fix" by loosening types.)

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire call-activity picker, drill-in, reusable toggle"
```

---

## Task 10: Toolbar button + Reusable toggle + sidebar badge

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/DiagramSidebar.tsx`

Gate: `npm run build` + manual.

- [ ] **Step 1: Add the new Toolbar props**

In `src/components/Toolbar.tsx`, add to the lucide import (line 2–19 block) the names `Boxes` and `Repeat` (insert alphabetically — e.g. `Boxes,` after the opening brace, `Repeat,` before `Redo2,`).

Extend the component prop type. Replace:

```tsx
}: {
  apiRef: MutableRefObject<BpmnApi | null>;
  onNew: () => void;
  onSave: () => void;
  onImportClick: () => void;
  onExport: (format: ExportFormat) => void;
}) {
```

with:

```tsx
}: {
  apiRef: MutableRefObject<BpmnApi | null>;
  onNew: () => void;
  onSave: () => void;
  onImportClick: () => void;
  onExport: (format: ExportFormat) => void;
  onAddCallActivity: () => void;
  onToggleCallable: () => void;
  isCallable: boolean;
}) {
```

Add `onAddCallActivity`, `onToggleCallable`, `isCallable` to the destructured parameter list at the top of the function signature (the `export default function Toolbar({ apiRef, onNew, onSave, onImportClick, onExport, … })` line).

- [ ] **Step 2: Render the two controls**

In `src/components/Toolbar.tsx`, find the Save button block:

```tsx
      <button className={btn} onClick={onSave}>
        <Save size={16} /> Save{isDirty ? ' •' : ''}
      </button>
```

Immediately after it, add:

```tsx
      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />
      <button
        className={btn}
        onClick={onAddCallActivity}
        disabled={mode === 'view'}
        title="Insert a reusable sub-process (Call Activity)"
      >
        <Boxes size={16} /> Sub-process
      </button>
      <button
        className={`${btn} ${isCallable ? 'text-blue-600 dark:text-blue-400' : ''}`}
        onClick={onToggleCallable}
        title={
          isCallable
            ? 'This diagram is reusable (callable by others)'
            : 'Mark this diagram as a reusable sub-process'
        }
      >
        <Repeat size={16} /> {isCallable ? 'Reusable ✓' : 'Reusable'}
      </button>
```

- [ ] **Step 3: Add the sidebar callable badge**

In `src/components/DiagramSidebar.tsx`, replace the diagram-name button:

```tsx
              <button
                onClick={() => onOpen(d.id)}
                className="flex-1 truncate text-left"
                title={d.name}
              >
                {d.name}
              </button>
```

with:

```tsx
              <button
                onClick={() => onOpen(d.id)}
                className="flex flex-1 items-center gap-1 truncate text-left"
                title={d.name}
              >
                <span className="truncate">{d.name}</span>
                {d.is_callable && (
                  <span className="shrink-0 rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    reusable
                  </span>
                )}
              </button>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: no TypeScript errors (Task 9's Toolbar props now satisfied).

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS — all suites green (`ids`, `bpmnXml`, `emptyDiagram`, `diagramRepository`).

- [ ] **Step 6: Manual end-to-end verification**

With real Clerk + Supabase env and the Task 5 SQL applied, `npm run dev`:
1. Create two new diagrams → confirm each has a distinct process id (Export `.bpmn`, inspect `<bpmn:process id="…">` — must differ).
2. Open diagram A, click **Reusable** → badge appears in the sidebar; reload → still flagged.
3. Open diagram B → **Sub-process** → picker lists A → pick it → a Call Activity appears labelled with A's name. Save B.
4. Double-click the Call Activity in B → diagram A opens.
5. **Sub-process → New reusable sub-process** → a new callable diagram is created and a Call Activity referencing it is inserted.
6. Export B as `.bpmn`, open it in Camunda Modeler (or re-import) → the `callActivity` with `calledElement` is present and valid.

- [ ] **Step 7: Commit**

```bash
git add src/components/Toolbar.tsx src/components/DiagramSidebar.tsx
git commit -m "feat(ui): sub-process button, reusable toggle, sidebar badge"
```

---

## Task 11: Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the stack + structure + commands + status**

In `CLAUDE.md`:

- Under **## Stack**, add a line:
  `- vitest — dev-only unit tests for pure logic (added with explicit approval; the only stack deviation, no runtime impact)`
- Under **## Project structure**, add inside `lib/`:
  ```
      ids.ts                 # bpmnId — org-unique xsd:ID-valid element ids
      bpmnXml.ts             # extractProcessId — derive process_id from XML
  ```
  and add under `components/`:
  ```
      CallActivityPicker.tsx # pick/create a reusable sub-process to call
  ```
- Under **## Commands**, add: `- `npm test` — Vitest unit suite (pure logic)`
- Under **## Verification status**, append: `Unit-tested: ids, bpmnXml, emptyDiagram factory, diagram insert payload. bpmn-js/UI paths gated by typecheck+build (no DOM harness).`
- Add a short paragraph under **## Data model**: `Reusable sub-processes: a diagram with `is_callable = true` is referenced by other diagrams via a standard `bpmn:callActivity` whose `calledElement` is the reusable diagram's top-level process id. `process_id` is a derived index of that id; the BPMN XML remains the source of truth and round-trips with standard tools.`

- [ ] **Step 2: Final full verification**

Run: `npm test && npm run build`
Expected: tests PASS, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document reusable sub-processes + Vitest"
```

---

## Self-Review

**Spec coverage:**
- BPMN compliance contract → Tasks 4, 7 (callActivity/calledElement, no proprietary data), verified Task 10 step 6.6.
- ID strategy (`makeEmptyDiagram`, 8-hex) → Tasks 2, 4.
- Schema columns + index, RLS unchanged → Task 5.
- Repository: process_id on create/save, `listCallableProcesses`, resolve by process id → Task 6.
- UX: mark reusable, picker (existing + new), drill-in, label = process name → Tasks 8, 9, 10.
- Out of scope (no versioning / no auto-extract / no bundle export) → not implemented (correct).
- Success criteria (distinct ids, two callers, Camunda round-trip, no runtime dep, legacy backfill) → Tasks 2/4, 10.6, 10.6, Task 1 (devDep only), Task 6 (`updateDiagramXml` backfills).

**Placeholder scan:** No TBD/TODO; every code step has full code; manual-verification steps are explicit and concrete.

**Type consistency:** `DiagramRow.process_id: string \| null` / `is_callable: boolean` consistent across `buildDiagramInsert`, selectors, App (`currentRow.is_callable`), picker (`c.process_id as string` — guarded by the `.not('process_id','is',null)` filter in `listCallableProcesses`), sidebar (`d.is_callable`). `BpmnApi.insertCallActivity`/`setCallActivityOpenHandler` signatures match their call sites in App. `makeEmptyDiagram()` (no args) used consistently in App + hook. Toolbar prop names (`onAddCallActivity`, `onToggleCallable`, `isCallable`) match App's `<Toolbar>` usage.
