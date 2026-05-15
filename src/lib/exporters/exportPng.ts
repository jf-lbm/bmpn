import { saveAs } from 'file-saver';
import { svgSize } from './util';

export async function exportPng(
  svg: string,
  filename = 'diagram.png',
  scale = 2,
): Promise<void> {
  const { width, height } = svgSize(svg);
  const url = URL.createObjectURL(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not rasterize SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('PNG encoding failed'));
        saveAs(blob, filename);
        resolve();
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
