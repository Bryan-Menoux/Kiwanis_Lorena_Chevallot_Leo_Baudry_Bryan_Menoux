function hasValue(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "";
  return value !== null && value !== undefined;
}

function hasExistingImagePreview(form, fieldName) {
  const existingPreview = form.querySelector(
    `#preview_${fieldName} [data-delete-image="${fieldName}"]`,
  );
  return existingPreview instanceof HTMLElement;
}

function hasSelectedFile(form, fieldName) {
  const input = form.querySelector(`[data-prop-file="${fieldName}"]`);
  return (
    input instanceof HTMLInputElement &&
    input.files instanceof FileList &&
    input.files.length > 0
  );
}

function hasAtLeastOnePart(form) {
  return [1, 2, 3].some((partNumber) => {
    const textInput = form.querySelector(`#input_texte_partie_${partNumber}`);
    const hasText =
      (textInput instanceof HTMLTextAreaElement ||
        textInput instanceof HTMLInputElement) &&
      textInput.value.trim().length > 0;
    const photoField = `photo_partie_${partNumber}`;
    const hasPhoto =
      hasSelectedFile(form, photoField) ||
      hasExistingImagePreview(form, photoField);
    return hasText || hasPhoto;
  });
}

function getMissingHeaderFields(form) {
  const missingFields = [];

  const titleInput = form.querySelector("#input_titre");
  const hasTitle =
    (titleInput instanceof HTMLInputElement ||
      titleInput instanceof HTMLTextAreaElement) &&
    titleInput.value.trim().length > 0;
  if (!hasTitle) missingFields.push("titre");

  const startDateInput = form.querySelector("#input_date_debut");
  const hasStartDate =
    startDateInput instanceof HTMLInputElement &&
    startDateInput.value.trim().length > 0;
  if (!hasStartDate) missingFields.push("date de début");

  const hasHero =
    hasSelectedFile(form, "hero") || hasExistingImagePreview(form, "hero");
  if (!hasHero) missingFields.push("image de l'en-tête");

  const typeActionSelect = form.querySelector("#input_type_action");
  const hasTypeAction =
    typeActionSelect instanceof HTMLSelectElement &&
    Array.from(typeActionSelect.selectedOptions).length > 0;
  if (!hasTypeAction) missingFields.push("type d'action");

  return missingFields;
}

function buildRequiredMessage(missingHeaderFields, missingPart) {
  const chunks = [];

  if (missingHeaderFields.length > 0) {
    chunks.push(`en-tête: ${missingHeaderFields.join(", ")}`);
  }
  if (missingPart) {
    chunks.push("au moins une partie (texte ou photo)");
  }

  if (chunks.length === 0) return "";
  return `Informations obligatoires manquantes: ${chunks.join(" ; ")}.`;
}

function buildStepOneRequiredMessage(missingHeaderFields) {
  if (!missingHeaderFields.length) return "";
  return `Complétez l'étape 1 en renseignant : ${missingHeaderFields.join(", ")}.`;
}

function isEditDraftContext(form) {
  return (
    form.getAttribute("data-form-mode") === "edit" &&
    form.getAttribute("data-is-draft") === "true"
  );
}

function isDraftSubmitAction(form, submitterName) {
  if (submitterName === "save_as") return true;
  return isEditDraftContext(form) && submitterName !== "publish_action";
}

function getSelectedTypeActionValues(formData) {
  const rawValues = formData.getAll("type_action");
  if (rawValues.length > 0) {
    return rawValues.map((value) => String(value).trim()).filter(Boolean);
  }

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

function normalizeTypeActionValues(values, allowedValues = [], maxSelect = 7) {
  const safeAllowedValues = Array.isArray(allowedValues) ? allowedValues : [];
  return Array.isArray(values)
    ? values
        .map((value) => String(value).trim())
        .filter((value) => value && safeAllowedValues.includes(value))
        .slice(0, maxSelect)
    : [];
}

function getNormalizedSelectedTypeActionValues(
  formData,
  allowedValues = [],
  maxSelect = 7,
) {
  return normalizeTypeActionValues(
    getSelectedTypeActionValues(formData),
    allowedValues,
    maxSelect,
  );
}

export {
  hasValue,
  hasExistingImagePreview,
  hasSelectedFile,
  hasAtLeastOnePart,
  getMissingHeaderFields,
  buildRequiredMessage,
  buildStepOneRequiredMessage,
  isEditDraftContext,
  isDraftSubmitAction,
  getSelectedTypeActionValues,
  normalizeTypeActionValues,
  getNormalizedSelectedTypeActionValues,
};
