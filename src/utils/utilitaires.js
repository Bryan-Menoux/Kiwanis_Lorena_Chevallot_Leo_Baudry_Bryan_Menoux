// Split du nom de l'utilisateur avec son prénom
export function splitUserName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }

  const nameParts = fullName.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: "",
    };
  }

  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" "),
  };
}

// Capitalise la première lettre de chaque mot du nom
export function capitalizeName(name) {
  if (!name || typeof name !== "string") return "";

  return name
    .split(" ")
    .map((namePart) => namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase())
    .join(" ");
}

// Fonctions utilitaires liées aux dates (réutilisables côté serveur et client)
export function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  try {
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().slice(0, 10);
  } catch (error) {
    return "";
  }
}

export function formatDateLong(dateValue) {
  if (!dateValue) return "";
  try {
    return new Date(dateValue).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
}

export function formatDateShort(dateValue) {
  if (!dateValue) return "";
  try {
    return new Date(dateValue).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
}

export function formatDateWithTime(dateValue) {
  if (!dateValue) return "";
  try {
    return new Date(dateValue).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    return "";
  }
}

// ----------------------------------------------------
// Fonctions utilisées dans preview.js
// ----------------------------------------------------

export function formatDateRange(dateStart, dateEnd) {
  if (!dateStart && !dateEnd) return "";
  try {
    const startFormatted = dateStart ? formatDateLong(dateStart) : "";
    const endFormatted = dateEnd ? formatDateLong(dateEnd) : "";
    return startFormatted && endFormatted
      ? `${startFormatted} au ${endFormatted}`
      : startFormatted || endFormatted;
  } catch (error) {
    return "";
  }
}

export function escapeHtml(inputString) {
  return String(inputString)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isDataUrl(candidateUrl) {
  return (
    typeof candidateUrl === "string" &&
    (candidateUrl.startsWith("data:") || candidateUrl.startsWith("blob:"))
  );
}

export function nowIso() {
  return new Date().toISOString();
}

// Exposer un objet global pratique pour les scripts client
try {
  if (typeof globalThis !== "undefined") {
    globalThis.dateUtils = Object.assign(globalThis.dateUtils || {}, {
      formatDateForInput,
      formatDateLong,
      formatDateRange,
      escapeHtml,
      isDataUrl,
      formatDateShort,
      formatDateWithTime,
      nowIso,
    });
  }
} catch (error) {
}

// Normalise référence d'image en URL en préférant l'API PocketBase.
// Usage : `normalizeImageUrl(value, record, pocketbaseClient)` où `pocketbaseClient` est typiquement `Astro.locals.pb`.
export function normalizeImageUrl(value, record, pocketbaseClient) {
  if (!value) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    value = value[0];
  }

  if (
    typeof value === "string" &&
    (value.startsWith("data:") ||
      value.startsWith("blob:") ||
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/"))
  ) {
    return value;
  }

  try {
    if (pocketbaseClient && pocketbaseClient.files && typeof pocketbaseClient.files.getURL === "function" && record) {
      const fileReference =
        typeof value === "string" ? value : value && (value.filename ?? value.name ?? value.id);
      if (fileReference) return pocketbaseClient.files.getURL(record, fileReference);
    }
  } catch (error) {
    // ignore et try fallbacks
  }

  if (typeof value === "object" && value !== null) {
    if (value.url) return value.url;
    if (value.directUrl) return value.directUrl;
    return null;
  }

  return null;
}
