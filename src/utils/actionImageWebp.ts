import sharp from "sharp";

const ACTION_SINGLE_IMAGE_FIELDS = [
  "hero",
  "photo_partie_1",
  "photo_partie_2",
  "photo_partie_3",
];

const ACTION_GALLERY_FIELD = "galerie_photos";
const WEBP_QUALITY = 82;

function isWebpFileName(fileName: string) {
  return /\.webp$/i.test(String(fileName || "").trim());
}

function toWebpFileName(fileName: string) {
  const trimmed = String(fileName || "").trim();
  if (!trimmed) return "image.webp";
  if (trimmed.includes(".")) return trimmed.replace(/\.[^.]+$/, ".webp");
  return `${trimmed}.webp`;
}

function isWebpFileLike(file: File) {
  const type = String(file.type || "").trim().toLowerCase();
  if (type === "image/webp") return true;
  return isWebpFileName(file.name);
}

async function convertFileToWebp(file: File, outputName?: string) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const webpBuffer = await sharp(inputBuffer)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return new File([webpBuffer], outputName || toWebpFileName(file.name), {
    type: "image/webp",
  });
}

async function downloadRecordFile(
  record: any,
  source: string,
  fileName: string,
  pocketbaseClient: any,
) {
  const normalizedSource = String(source || "").trim();
  const normalizedFileName = String(fileName || "").trim();
  const normalizedBaseUrl = String(pocketbaseClient?.baseUrl || "").trim();
  if (!normalizedSource && !normalizedFileName) return null;

  const tryFetch = async (url: string) => {
    const trimmedUrl = String(url || "").trim();
    if (!trimmedUrl) return null;

    let fetchUrl = trimmedUrl;
    try {
      fetchUrl = normalizedBaseUrl
        ? new URL(trimmedUrl, normalizedBaseUrl).toString()
        : new URL(trimmedUrl).toString();
    } catch {
      return null;
    }

    const response = await fetch(fetchUrl, {
      headers: pocketbaseClient?.authStore?.token
        ? { Authorization: `Bearer ${pocketbaseClient.authStore.token}` }
        : undefined,
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    return new File([blob], normalizedFileName, {
      type: blob.type || "application/octet-stream",
    });
  };

  const candidateUrls: string[] = [];

  if (/^https?:\/\//i.test(normalizedSource)) {
    candidateUrls.push(normalizedSource);
  } else if (normalizedSource.startsWith("/")) {
    if (normalizedBaseUrl) {
      candidateUrls.push(new URL(normalizedSource, normalizedBaseUrl).toString());
    }
  }

  if (normalizedFileName) {
    try {
      candidateUrls.push(pocketbaseClient.files.getURL(record, normalizedFileName));
    } catch {
      // Fallback handled below.
    }
  }

  for (const url of candidateUrls) {
    const file = await tryFetch(url);
    if (file) return file;
  }

  try {
    const token = await pocketbaseClient.files.getToken();
    const tokenUrl = normalizedFileName
      ? pocketbaseClient.files.getURL(record, normalizedFileName, { token })
      : normalizedSource;
    const file = await tryFetch(tokenUrl);
    if (file) return file;
  } catch {
    // Si le fichier n'est pas accessible, l'appelant gérera l'erreur.
  }

  return null;
}

function getFileReference(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return "";
    try {
      const baseUrl =
        trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : `https://local.invalid${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      const parsed = new URL(baseUrl);
      const pathname = parsed.pathname.split("/").filter(Boolean).pop() || "";
      const candidate = pathname || trimmed;
      const withoutQuery = candidate.split("?")[0].split("#")[0].trim();
      return decodeURIComponent(withoutQuery);
    } catch {
      const noQuery = trimmed.split("?")[0].split("#")[0].trim();
      const parts = noQuery.split("/").filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || noQuery);
    }
  }
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  if (value && typeof value === "object") {
    const candidate = value as { filename?: unknown; name?: unknown; id?: unknown };
    if (typeof candidate.filename === "string") return candidate.filename.trim();
    if (typeof candidate.name === "string") return candidate.name.trim();
    if (typeof candidate.id === "string") return candidate.id.trim();
  }
  return "";
}

async function normalizeImageValue(
  value: unknown,
  record: any,
  pocketbaseClient: any,
  options?: { forceDownloadExistingFile?: boolean },
): Promise<unknown> {
  if (value instanceof File) {
    return isWebpFileLike(value)
      ? value
      : convertFileToWebp(value, toWebpFileName(value.name));
  }

  if (Array.isArray(value)) {
    const normalizedEntries: unknown[] = [];
    for (const entry of value) {
      const normalizedEntry: unknown = await normalizeImageValue(
        entry,
        record,
        pocketbaseClient,
        options,
      );
      if (normalizedEntry === undefined || normalizedEntry === null || normalizedEntry === "") {
        continue;
      }
      normalizedEntries.push(normalizedEntry);
    }
    return normalizedEntries;
  }

  if (typeof value !== "string") return value;

  const fileName = value.trim();
  const fileReference = getFileReference(fileName);
  if (!fileReference) return value;
  if (!record || !pocketbaseClient) return value;

  const file = await downloadRecordFile(record, fileName, fileReference, pocketbaseClient);
  if (!file) {
    throw new Error(`Impossible de récupérer le fichier "${fileReference}" pour le convertir en WebP.`);
  }

  if (
    options?.forceDownloadExistingFile &&
    (isWebpFileName(fileReference) || isWebpFileName(fileName) || isWebpFileLike(file))
  ) {
    return new File([file], fileReference || toWebpFileName(file.name), {
      type: file.type || "image/webp",
    });
  }

  if (isWebpFileName(fileReference)) return value;
  if (isWebpFileName(fileName)) return value;

  return convertFileToWebp(file, toWebpFileName(file.name || fileReference));
}

export async function normalizeActionImagesForSave(
  payload: Record<string, any>,
  record: any,
  pocketbaseClient: any,
  options?: { forceDownloadExistingFile?: boolean },
) {
  for (const fieldName of ACTION_SINGLE_IMAGE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, fieldName)) continue;
    const currentValue = payload[fieldName];
    if (currentValue === undefined || currentValue === null || currentValue === "") continue;
    payload[fieldName] = await normalizeImageValue(
      currentValue,
      record,
      pocketbaseClient,
      options,
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, ACTION_GALLERY_FIELD)) {
    const galleryValue = payload[ACTION_GALLERY_FIELD];
    if (Array.isArray(galleryValue)) {
      const normalizedGallery = [];
      for (const entry of galleryValue) {
        const normalizedEntry = await normalizeImageValue(
          entry,
          record,
          pocketbaseClient,
          options,
        );
        if (normalizedEntry === undefined || normalizedEntry === null || normalizedEntry === "") {
          continue;
        }
        normalizedGallery.push(normalizedEntry);
      }
      payload[ACTION_GALLERY_FIELD] = normalizedGallery.length ? normalizedGallery : "";
    } else if (galleryValue !== undefined && galleryValue !== null && galleryValue !== "") {
      payload[ACTION_GALLERY_FIELD] = await normalizeImageValue(
        galleryValue,
        record,
        pocketbaseClient,
        options,
      );
    }
  }

  return payload;
}

export {
  ACTION_GALLERY_FIELD,
  ACTION_SINGLE_IMAGE_FIELDS,
  convertFileToWebp,
  downloadRecordFile,
  getFileReference,
  isWebpFileName,
  isWebpFileLike,
  normalizeImageValue,
  toWebpFileName,
};
