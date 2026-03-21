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

async function downloadRecordFile(record: any, fileName: string, pocketbaseClient: any) {
  const normalizedFileName = String(fileName || "").trim();
  if (!normalizedFileName) return null;

  const tryFetch = async (url: string) => {
    const response = await fetch(url, {
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

  let file = await tryFetch(pocketbaseClient.files.getURL(record, normalizedFileName));
  if (file) return file;

  try {
    const token = await pocketbaseClient.files.getToken();
    file = await tryFetch(
      pocketbaseClient.files.getURL(record, normalizedFileName, { token }),
    );
  } catch {
    // Si le fichier n'est pas accessible, l'appelant gérera l'erreur.
  }

  return file;
}

function getFileReference(value: unknown) {
  if (typeof value === "string") return value.trim();
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
) {
  if (value instanceof File) {
    return isWebpFileLike(value)
      ? value
      : convertFileToWebp(value, toWebpFileName(value.name));
  }

  if (Array.isArray(value)) {
    const normalizedEntries = [];
    for (const entry of value) {
      const normalizedEntry = await normalizeImageValue(entry, record, pocketbaseClient);
      if (normalizedEntry === undefined || normalizedEntry === null || normalizedEntry === "") {
        continue;
      }
      normalizedEntries.push(normalizedEntry);
    }
    return normalizedEntries;
  }

  if (typeof value !== "string") return value;

  const fileName = value.trim();
  if (!fileName) return value;
  if (isWebpFileName(fileName)) return value;
  if (!record || !pocketbaseClient) return value;

  const file = await downloadRecordFile(record, fileName, pocketbaseClient);
  if (!file) {
    throw new Error(`Impossible de récupérer le fichier "${fileName}" pour le convertir en WebP.`);
  }

  return convertFileToWebp(file, toWebpFileName(file.name || fileName));
}

export async function normalizeActionImagesForSave(
  payload: Record<string, any>,
  record: any,
  pocketbaseClient: any,
) {
  for (const fieldName of ACTION_SINGLE_IMAGE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, fieldName)) continue;
    const currentValue = payload[fieldName];
    if (currentValue === undefined || currentValue === null || currentValue === "") continue;
    payload[fieldName] = await normalizeImageValue(currentValue, record, pocketbaseClient);
  }

  if (Object.prototype.hasOwnProperty.call(payload, ACTION_GALLERY_FIELD)) {
    const galleryValue = payload[ACTION_GALLERY_FIELD];
    if (Array.isArray(galleryValue)) {
      const normalizedGallery = [];
      for (const entry of galleryValue) {
        const normalizedEntry = await normalizeImageValue(entry, record, pocketbaseClient);
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
