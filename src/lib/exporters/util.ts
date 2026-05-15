export function svgSize(svg: string): { width: number; height: number } {
  const vb = /viewBox="([\d.\-\s]+)"/.exec(svg);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const w = /\bwidth="([\d.]+)"/.exec(svg);
  const h = /\bheight="([\d.]+)"/.exec(svg);
  return {
    width: w ? Number(w[1]) : 1200,
    height: h ? Number(h[1]) : 800,
  };
}
