import type { SupabaseClient } from '@supabase/supabase-js';

export interface DiagramRow {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  bpmn_xml: string;
  created_at: string;
  updated_at: string;
}

export type DiagramSummary = Omit<DiagramRow, 'bpmn_xml'>;

const SUMMARY_COLS = 'id, org_id, owner_id, name, created_at, updated_at';

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
  input: { orgId: string; ownerId: string; name: string; bpmnXml: string },
): Promise<DiagramRow> {
  const { data, error } = await db
    .from('diagrams')
    .insert({
      org_id: input.orgId,
      owner_id: input.ownerId,
      name: input.name,
      bpmn_xml: input.bpmnXml,
    })
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
    .update({ bpmn_xml: bpmnXml })
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
