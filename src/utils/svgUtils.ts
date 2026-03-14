// Utilitaire pour normaliser les SVG
export function normalizeSvg(svgRaw: string, options: { color?: string } = {}) {
  let result = svgRaw
    .replace(/\s+width="[^"]*"/, ' width="100%"')
    .replace(/\s+height="[^"]*"/, ' height="100%"');

  if (options.color) {
    result = result.replace(/<\?xml[^?]*\?>\s*/g, '')
      .replace(/<!--[\s\S]*?-->\s*/g, '')
      .replace(/fill="#[0-9A-F]{6}"/gi, `fill="${options.color}"`)
      .trim();
  }

  return result;
}
