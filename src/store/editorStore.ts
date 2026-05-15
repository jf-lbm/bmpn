import { create } from 'zustand';

export type EditorMode = 'edit' | 'view';

interface EditorState {
  isDirty: boolean;
  mode: EditorMode;
  dark: boolean;
  panelOpen: boolean;
  elementCount: number;
  zoom: number;
  setDirty: (dirty: boolean) => void;
  setMode: (mode: EditorMode) => void;
  toggleMode: () => void;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setElementCount: (count: number) => void;
  setZoom: (zoom: number) => void;
}

const prefersDark =
  typeof window !== 'undefined' &&
  window.localStorage.getItem('bmpn:dark') === '1';

export const useEditorStore = create<EditorState>((set) => ({
  isDirty: false,
  mode: 'edit',
  dark: prefersDark,
  panelOpen: true,
  elementCount: 0,
  zoom: 1,
  setDirty: (isDirty) => set({ isDirty }),
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === 'edit' ? 'view' : 'edit' })),
  setDark: (dark) => set({ dark }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setElementCount: (elementCount) => set({ elementCount }),
  setZoom: (zoom) => set({ zoom }),
}));
