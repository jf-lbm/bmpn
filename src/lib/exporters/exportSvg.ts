import { saveAs } from 'file-saver';

export function exportSvg(svg: string, filename = 'diagram.svg'): void {
  saveAs(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}
