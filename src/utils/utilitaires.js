// Split du nom de l'utilisateur avec son prénom
export function splitUserName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

// Capitalise la première lettre de chaque mot du nom
export function capitalizeName(name) {
  if (!name || typeof name !== "string") return "";

  return name.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Fonctions utilitaires liées aux dates (réutilisables côté serveur et client)
export function formatDateForInput(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

export function formatDateLong(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) {
    return "";
  }
}

export function formatDateShort(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "";
  }
}

export function formatDateWithTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    return "";
  }
}

export function nowIso() {
  return new Date().toISOString();
}

// Exposer un objet global pratique pour les scripts client
try {
  if (typeof globalThis !== 'undefined') {
    globalThis.dateUtils = Object.assign(globalThis.dateUtils || {}, {
      formatDateForInput,
      formatDateLong,
      formatDateShort,
      formatDateWithTime,
      nowIso,
    });
  }
} catch (e) {
  // noop
}


// Normalise référence d'image en URL en préférant l'API PocketBase.
// Usage : `normalizeImageUrl(value, record, pb)` où `pb` est typiquement `Astro.locals.pb`.
export function normalizeImageUrl(v, record, pb) {
  if (!v) return null;

  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    v = v[0];
  }

  if (typeof v === 'string' && (v.startsWith('data:') || v.startsWith('blob:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/'))) {
    return v;
  }

  try {
    if (pb && pb.files && typeof pb.files.getURL === 'function' && record) {
      const fileRef = typeof v === 'string' ? v : (v && (v.filename ?? v.name ?? v.id));
      if (fileRef) return pb.files.getURL(record, fileRef);
    }
  } catch (e) {
    // ignore et try fallbacks
  }

  if (typeof v === 'object' && v !== null) {
    if (v.url) return v.url;
    if (v.directUrl) return v.directUrl;
    return null;
  }

  return null;
}


