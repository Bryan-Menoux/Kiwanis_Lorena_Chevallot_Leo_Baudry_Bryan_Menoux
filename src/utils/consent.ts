export const CONSENT_STORAGE_KEY = "kiwanis_cookie_preferences";
export const CONSENT_VERSION = 1;
export const CONSENT_RETENTION_DAYS = 180;
export const CONSENT_EVENT_READY = "kiwanis:consent-ready";
export const CONSENT_EVENT_CHANGED = "kiwanis:consent-changed";
export const CONSENT_OPEN_EVENT = "kiwanis:open-consent";
export const EXTERNAL_SERVICES_CATEGORY = "externalServices";

export const INTERNAL_HOSTNAMES = [
  "kiwanis-pays-de-montbeliard.fr",
  "www.kiwanis-pays-de-montbeliard.fr",
  "kiwanis-montbeliard.fr",
  "www.kiwanis-montbeliard.fr",
  "pb.kiwanis-pays-de-montbeliard.fr",
  "pb-kiwanis.bryan-menoux.fr",
  "127.0.0.1",
  "localhost",
];

export interface ConsentPreferences {
  version: number;
  updatedAt: string;
  expiresAt: string;
  categories: {
    externalServices: boolean;
  };
}

const CONSENT_RETENTION_MS =
  CONSENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function createConsentPreferences(
  externalServices: boolean,
): ConsentPreferences {
  const updatedAt = new Date();

  return {
    version: CONSENT_VERSION,
    updatedAt: updatedAt.toISOString(),
    expiresAt: new Date(
      updatedAt.getTime() + CONSENT_RETENTION_MS,
    ).toISOString(),
    categories: {
      externalServices,
    },
  };
}

export function isConsentPreferencesExpired(
  preferences: ConsentPreferences | null | undefined,
) {
  if (!preferences) return true;
  if (preferences.version !== CONSENT_VERSION) return true;

  const expiresAt = Date.parse(preferences.expiresAt || "");
  if (!Number.isFinite(expiresAt)) return true;

  return expiresAt <= Date.now();
}

export function parseConsentPreferences(
  value: string | null | undefined,
): ConsentPreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ConsentPreferences;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.categories !== "object"
    ) {
      return null;
    }

    return {
      version: Number(parsed.version) || CONSENT_VERSION,
      updatedAt: String(parsed.updatedAt || ""),
      expiresAt: String(parsed.expiresAt || ""),
      categories: {
        externalServices: Boolean(
          parsed.categories?.externalServices,
        ),
      },
    };
  } catch {
    return null;
  }
}

export function serializeConsentPreferences(
  preferences: ConsentPreferences,
) {
  return JSON.stringify(preferences);
}

export function hasExternalServicesConsent(
  preferences: ConsentPreferences | null | undefined,
) {
  return Boolean(preferences?.categories?.externalServices);
}

export function isExternalHttpUrl(value: unknown) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return !INTERNAL_HOSTNAMES.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
