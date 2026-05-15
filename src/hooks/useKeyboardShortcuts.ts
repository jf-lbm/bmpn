import { useEffect } from 'react';

// bpmn-js (keyboard.bindTo: document) already handles undo/redo/delete/copy.
// We only add the app-level Save and Open shortcuts here.
export function useKeyboardShortcuts(handlers: {
  onSave: () => void;
  onOpen: () => void;
}): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        handlers.onSave();
      } else if (key === 'o') {
        e.preventDefault();
        handlers.onOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
