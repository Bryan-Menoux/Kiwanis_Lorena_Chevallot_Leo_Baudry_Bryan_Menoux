// Utilitaire réutilisable pour les pages de modification/édition
// Consolide la validation de formulaire, la gestion des fichiers et les opérations de base de données

export interface EditPageConfig {
  collection: string; // Nom de la collection principale (ex: 'actions', 'projets')
  redirectPath: string; // Chemin de redirection après la mise à jour
  recordId?: string; // ID de l'enregistrement en édition
  draftCollection?: string; // Nom de la collection de brouillons si applicable (ex: 'brouillons')
  isDraft?: boolean; // Si l'enregistrement courant est un brouillon
  requiredFields?: string[]; // Champs qui ne doivent pas être vides
  emptyableFields?: Set<string>; // Champs pouvant être explicitement vidés
  fileFields?: string[]; // Champs fichier unique
  galleryFields?: string[]; // Champs de galerie multi-fichiers
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valide les données du formulaire par rapport aux champs obligatoires
 */
export function validateFormData(
  formData: FormData,
  existingRecord: any,
  requiredFields: string[] = [],
  emptyableFields: Set<string> = new Set()
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const formValue = formData.get(field)?.toString().trim();
    const recordValue = existingRecord?.[field];
    const isFieldRemoved = formData.get(`remove_${field}`)?.toString() === "true";

    // Vérifie si le champ sera vide après la soumission
    const hasValue = formValue
      ? formValue !== ""
      : recordValue && !isFieldRemoved;

    if (!hasValue) {
      // Convertit le nom du champ en format lisible
      const friendlyName = field.replace(/_/g, " ");
      errors.push(friendlyName);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extrait les champs texte du formulaire et supprime les drapeaux internes
 */
export function extractTextFields(
  formData: FormData,
  emptyableFields: Set<string>,
  fieldsToSkip: Set<string> = new Set()
): Record<string, any> {
  const data: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    // Ignore les fichiers et les drapeaux internes
    if (value instanceof File) continue;
    if (key.startsWith("remove_")) continue;
    if (fieldsToSkip.has(key)) continue;

    const stringValue = value.toString().trim();

    // Gère les champs numériques
    if (key === "chiffre") {
      if (stringValue === "") {
        data[key] = "";
      } else {
        const parsed = Number(stringValue);
        data[key] = Number.isFinite(parsed) ? parsed : "";
      }
      continue;
    }

    // Gère les champs qui peuvent être vidés
    if (emptyableFields.has(key)) {
      data[key] = stringValue;
      continue;
    }

    // Ajoute uniquement les valeurs non vides
    if (stringValue !== "") {
      data[key] = stringValue;
    }
  }

  return data;
}

/**
 * Extrait les fichiers des données du formulaire, en séparant les fichiers uniques et galerie
 */
export function extractFiles(
  formData: FormData,
  galleryFields: string[] = []
): { single: Record<string, File>; gallery: Record<string, File[]> } {
  const single: Record<string, File> = {};
  const gallery: Record<string, File[]> = {};

  for (const [key, value] of formData.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;

    if (galleryFields.includes(key)) {
      if (!gallery[key]) {
        gallery[key] = [];
      }
      gallery[key].push(value);
    } else {
      single[key] = value;
    }
  }

  return { single, gallery };
}

/**
 * Traite les drapeaux de suppression de fichiers pour déterminer quels fichiers doivent être supprimés
 */
export function getFilesToRemove(formData: FormData): Set<string> {
  const filesToRemove = new Set<string>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("remove_")) {
      const field = key.replace(/^remove_/, "");
      const shouldRemove = value?.toString?.().trim();
      if (shouldRemove) {
        filesToRemove.add(field);
      }
    }
  }

  return filesToRemove;
}

/**
 * Génère un slug à partir d'une chaîne de titre
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Supprime les caractères spéciaux
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/-+/g, "-") // Supprime les tirets multiples consécutifs
    .replace(/^-+|-+$/g, ""); // Supprime les tirets au début et à la fin
}

/**
 * Prépare le payload pour la mise à jour/création en base de données
 * Fusionne les champs texte, les champs fichier et gère la galerie séparément
 */
export function preparePayload(
  textFields: Record<string, any>,
  fileFields: Record<string, File>,
  additionalData: Record<string, any> = {}
): Record<string, any> {
  return {
    ...textFields,
    ...fileFields,
    ...additionalData,
  };
}

/**
 * Gère les modifications des fichiers galerie (suppressions et ajouts)
 */
export function processGalleryModifications(
  existingGallery: any[],
  filesToRemove: Set<string>,
  newFiles: File[],
  normalizeImageUrl: (url: any) => string
): any[] {
  // Filtre les fichiers supprimés
  const kept = existingGallery.filter((file) => {
    const url = normalizeImageUrl(file);
    return !filesToRemove.has(url);
  });

  // Combine avec les nouveaux fichiers
  return [...kept, ...newFiles];
}

/**
 * Gère la suppression de champs en les mettant à vide
 */
export function handleFieldRemovals(
  data: Record<string, any>,
  filesToRemove: Set<string>
): Record<string, any> {
  for (const field of filesToRemove) {
    data[field] = "";
  }
  return data;
}

/**
 * Vérifie si l'enregistrement est vide/nouveau en fonction de l'ID
 */
export function isNewRecord(recordId?: string): boolean {
  return !recordId || recordId.trim() === "";
}

/**
 * Aide à construire une URL de redirection avec un message de succès
 */
export function buildRedirectUrl(
  path: string,
  message: string
): string {
  return `${path}?success=${encodeURIComponent(message)}`;
}
