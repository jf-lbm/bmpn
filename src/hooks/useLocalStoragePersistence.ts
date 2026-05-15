// The DB is the source of truth for diagrams. localStorage only remembers
// which diagram to reopen on reload (scoped per Clerk organization).
const KEY = (orgId: string) => `bmpn:lastDiagram:${orgId}`;

export function getLastDiagramId(orgId: string): string | null {
  try {
    return window.localStorage.getItem(KEY(orgId));
  } catch {
    return null;
  }
}

export function setLastDiagramId(orgId: string, id: string | null): void {
  try {
    if (id) window.localStorage.setItem(KEY(orgId), id);
    else window.localStorage.removeItem(KEY(orgId));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
