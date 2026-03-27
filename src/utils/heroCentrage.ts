export type HeroSupport = "desktop" | "tablet" | "mobile";

export type HeroCropPoint = {
  x: number;
  y: number;
};

export type HeroCentrageMap = Partial<Record<HeroSupport, HeroCropPoint>>;

const DEFAULT_CROP_POINT: HeroCropPoint = {
  x: 50,
  y: 50,
};

function clampPercent(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 50;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

export function normalizeHeroCropPoint(value: unknown): HeroCropPoint | null {
  if (!value || typeof value !== "object") return null;

  return {
    x: clampPercent((value as HeroCropPoint).x),
    y: clampPercent((value as HeroCropPoint).y),
  };
}

export function parseHeroCentrage(value: unknown): HeroCentrageMap {
  if (!value) return {};

  const rawValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        })()
      : value;

  if (!rawValue || typeof rawValue !== "object") return {};

  const nextCentrage: HeroCentrageMap = {};

  for (const support of ["desktop", "tablet", "mobile"] as const) {
    const point = normalizeHeroCropPoint(
      (rawValue as Record<string, unknown>)[support],
    );
    if (point) {
      nextCentrage[support] = point;
    }
  }

  return nextCentrage;
}

export function serializeHeroCentrage(value: unknown): HeroCentrageMap {
  const centrage = parseHeroCentrage(value);
  return Object.fromEntries(
    Object.entries(centrage).map(([support, point]) => [
      support,
      { x: point.x, y: point.y },
    ]),
  );
}

export function getHeroCropPoint(
  centrage: unknown,
  support: HeroSupport,
): HeroCropPoint {
  return parseHeroCentrage(centrage)[support] || DEFAULT_CROP_POINT;
}

export function getHeroObjectPosition(
  centrage: unknown,
  support: HeroSupport,
): string {
  const point = getHeroCropPoint(centrage, support);
  return `${point.x}% ${point.y}%`;
}
