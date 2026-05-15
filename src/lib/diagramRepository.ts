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

export async function listDiagrams(
  db: SupabaseClient,
): Promise<DiagramSummary[]> {
  const { data, error } = await db
    .from('diagrams')
    .select(SUMMARY_COLS)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DiagramSummary[];
}

export async function getDiagram(
  db: SupabaseClient,
  id: string,
): Promise<DiagramRow> {
  const { data, error } = await db
    .from('diagrams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as DiagramRow;
}

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

export async function renameDiagram(
  db: SupabaseClient,
  id: string,
  name: string,
): Promise<void> {
  const { error } = await db.from('diagrams').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDiagram(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from('diagrams').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

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
  // Legacy/imported diagrams can share a process id; pick the most
  // recently updated so drill-in resolves to a deterministic target.
  const { data, error } = await db
    .from('diagrams')
    .select(SUMMARY_COLS)
    .eq('process_id', processId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DiagramSummary | null;
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
