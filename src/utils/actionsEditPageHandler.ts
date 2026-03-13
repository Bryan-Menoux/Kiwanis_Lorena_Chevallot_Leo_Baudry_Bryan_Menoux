// Gestionnaire spécialisé pour les pages d'édition/création d'actions
// Encapsule la validation et le traitement des données spécifiques aux actions

import type { AstroCookies } from 'astro';

export interface ActionEditConfig {
  recordId?: string;
  isDraft?: boolean;
  pb: any; // PocketBase instance
}

export interface ActionValidationResult {
  isValid: boolean;
  missingFields: string[];
}

// Constantes spécifiques aux actions
export const PART_NUMBERS = [1, 2, 3];
export const EMPTYABLE_FIELDS = new Set([
  "nom_lieu",
  "adresse_lieu",
  "lien_lieu",
  "chiffre",
  "type_de_chiffre",
]);

export const FILE_FIELDS = ["hero", "photo_partie_1", "photo_partie_2", "photo_partie_3"];
export const GALLERY_FIELDS = ["galerie_photos"];

// Vérifie si une valeur est remplie (non vide et non nulle)
export function isRecordValueFilled(value: any): boolean {
  return typeof value === "string" ? value.trim() !== "" : Boolean(value);
}

// Vérifie si une valeur chaîne n'est pas vide
export function isNonEmptyString(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}

// Vérifie si un fichier a été téléchargé (existe et taille > 0)
export function hasUploadedFile(formData: FormData, fieldName: string): boolean {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0;
}

// Vérifie si un champ a été marqué pour suppression
export function isFieldRemoved(formData: FormData, fieldName: string): boolean {
  const raw = formData.get(`remove_${fieldName}`);
  if (!raw) return false;
  const normalized = raw.toString().trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

// Vérifie si l'image hero existera après la soumission
export function hasHeroAfterSubmit(formData: FormData, record: any): boolean {
  return (
    hasUploadedFile(formData, "hero") ||
    (isRecordValueFilled(record?.hero) && !isFieldRemoved(formData, "hero"))
  );
}

// Vérifie si le titre existera après la soumission
export function hasTitleAfterSubmit(formData: FormData, record: any): boolean {
  const titleFromForm = isNonEmptyString(formData.get("titre"));
  const titleFromRecord = isRecordValueFilled(record?.titre);
  return formData.has("titre") ? titleFromForm : titleFromRecord;
}

// Vérifie si la date de début existera après la soumission
export function hasStartDateAfterSubmit(formData: FormData, record: any): boolean {
  const startDateFromForm = isNonEmptyString(formData.get("date_debut"));
  const startDateFromRecord = isRecordValueFilled(record?.date_debut);
  return formData.has("date_debut") ? startDateFromForm : startDateFromRecord;
}

// Obtient les valeurs type_action soumises
export function getSubmittedTypeActionValues(formData: FormData): string[] | null {
  if (!formData.has("type_action")) return null;
  const rawValue = formData.get("type_action");
  if (typeof rawValue !== "string") return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Vérifie si type_action existera après la soumission
export function hasTypeActionAfterSubmit(formData: FormData, record: any): boolean {
  const submittedValues = getSubmittedTypeActionValues(formData);
  if (submittedValues !== null) {
    return submittedValues.length > 0;
  }
  return Array.isArray(record?.type_action) && record.type_action.length > 0;
}

// Vérifie si au moins une partie (texte ou photo) existe
export function hasAtLeastOnePartAfterSubmit(formData: FormData, record: any): boolean {
  return PART_NUMBERS.some((partNumber) => {
    const textKey = `texte_partie_${partNumber}`;
    const photoKey = `photo_partie_${partNumber}`;
    const textFromForm = isNonEmptyString(formData.get(textKey));
    const textFromRecord = isRecordValueFilled(record?.[textKey]);
    const hasText = formData.has(textKey) ? textFromForm : textFromRecord;
    const hasPhoto =
      hasUploadedFile(formData, photoKey) ||
      (isRecordValueFilled(record?.[photoKey]) && !isFieldRemoved(formData, photoKey));
    return hasText || hasPhoto;
  });
}

/**
 * Valide les données d'action avant la soumission
 * Retourne la liste des champs obligatoires manquants
 */
export function validateActionForPublish(
  formData: FormData,
  record: any
): ActionValidationResult {
  const missingFields: string[] = [];

  if (!hasTitleAfterSubmit(formData, record)) {
    missingFields.push("titre");
  }

  if (!hasStartDateAfterSubmit(formData, record)) {
    missingFields.push("date de début");
  }

  if (!hasHeroAfterSubmit(formData, record)) {
    missingFields.push("image de l'en-tête");
  }

  if (!hasTypeActionAfterSubmit(formData, record)) {
    missingFields.push("type d'action");
  }

  if (!hasAtLeastOnePartAfterSubmit(formData, record)) {
    missingFields.push("au moins une partie (texte ou photo)");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// Conserve les champs d'image existants s'ils ne sont pas remplacés par un nouveau téléchargement
export function keepExistingImageFields(
  payload: Record<string, any>,
  record: any
): Record<string, any> {
  if (payload.hero === undefined && isRecordValueFilled(record?.hero)) {
    payload.hero = record.hero;
  }
  if (payload.photo_partie_1 === undefined && isRecordValueFilled(record?.photo_partie_1)) {
    payload.photo_partie_1 = record.photo_partie_1;
  }
  if (payload.photo_partie_2 === undefined && isRecordValueFilled(record?.photo_partie_2)) {
    payload.photo_partie_2 = record.photo_partie_2;
  }
  if (payload.photo_partie_3 === undefined && isRecordValueFilled(record?.photo_partie_3)) {
    payload.photo_partie_3 = record.photo_partie_3;
  }
  if (
    payload.galerie_photos === undefined &&
    Array.isArray(record?.galerie_photos) &&
    record.galerie_photos.length > 0
  ) {
    payload.galerie_photos = [...record.galerie_photos];
  }
  return payload;
}

// Normalise l'URL d'image pour l'aperçu (support des formats locaux et distants)
export function getNormalizedPreviewImage(
  value: any,
  record: any,
  normalizeImageUrl: (value: any, record: any, pb: any) => string,
  pb: any
): string | null {
  const normalized = normalizeImageUrl(value, record, pb);
  if (typeof normalized === "string" && normalized.trim() !== "") {
    return normalized;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("api/")) return `/${raw}`;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }
  return null;
}

// Construit une URL de redirection avec un message de succès encodé en paramètre
export function buildSuccessRedirect(path: string, message: string): string {
  return `${path}?success=${encodeURIComponent(message)}`;
}
