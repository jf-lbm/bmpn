import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { svgSize } from './util';

export async function exportPdf(
  svg: string,
  filename = 'diagram.pdf',
): Promise<void> {
  const { width, height } = svgSize(svg);
  const doc = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const scale = Math.min(
    (pageW - 2 * margin) / width,
    (pageH - 2 * margin) / height,
  );
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml')
    .documentElement as unknown as Element;
  await doc.svg(el, {
    x: margin,
    y: margin,
    width: width * scale,
    height: height * scale,
  });
  doc.save(filename);
}
