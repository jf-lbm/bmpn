import { create } from 'zustand';

export type EditorMode = 'edit' | 'view';

interface EditorState {
  // diagram identity (DB-backed)
  diagramId: string | null;
  diagramName: string;
  // editing state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  mode: EditorMode;
  // ui
  dark: boolean;
  panelOpen: boolean;
  sidebarOpen: boolean;
  // canvas readouts
  elementCount: number;
  zoom: number;
  setDiagram: (id: string | null, name: string) => void;
  setDiagramName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
  setMode: (mode: EditorMode) => void;
  toggleMode: () => void;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
  togglePanel: () => void;
  toggleSidebar: () => void;
  setElementCount: (count: number) => void;
  setZoom: (zoom: number) => void;
}

const prefersDark =
  typeof window !== 'undefined' &&
  window.localStorage.getItem('bmpn:dark') === '1';

export const useEditorStore = create<EditorState>((set) => ({
  diagramId: null,
  diagramName: 'Untitled',
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  mode: 'edit',
  dark: prefersDark,
  panelOpen: true,
  sidebarOpen: true,
  elementCount: 0,
  zoom: 1,
  setDiagram: (diagramId, diagramName) =>
    set({ diagramId, diagramName, isDirty: false, lastSavedAt: null }),
  setDiagramName: (diagramName) => set({ diagramName }),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  markSaved: () =>
    set({ isDirty: false, isSaving: false, lastSavedAt: Date.now() }),
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === 'edit' ? 'view' : 'edit' })),
  setDark: (dark) => set({ dark }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setElementCount: (elementCount) => set({ elementCount }),
  setZoom: (zoom) => set({ zoom }),
}));
