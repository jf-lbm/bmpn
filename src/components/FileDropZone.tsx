import { useEffect, useState } from 'react';

export default function FileDropZone({
  onFile,
}: {
  onFile: (xml: string, name: string) => void;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const isFileDrag = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setActive(true);
    };
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setActive(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const text = await file.text();
      onFile(text, file.name.replace(/\.(bpmn|xml)$/i, '') || 'Imported');
    };

    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onFile]);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed border-blue-400 bg-blue-500/10 text-lg font-medium text-blue-600">
      Drop .bpmn to import
    </div>
  );
}
