export const normalizeSearchTerm = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export const matchesNormalizedSearch = (
  haystack: unknown,
  needle: unknown,
): boolean => {
  const normalizedNeedle = normalizeSearchTerm(needle);
  if (!normalizedNeedle) return true;
  return normalizeSearchTerm(haystack).includes(normalizedNeedle);
};
