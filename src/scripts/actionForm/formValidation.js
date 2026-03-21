import { showAlert } from "../../utils/alerts";
import {
  buildRequiredMessage,
  buildWordLimitMessage,
  getMissingHeaderFields,
  hasAtLeastOnePart,
  getOverLimitPartTextFieldsFromForm,
  isEditDraftContext,
} from "./validation.js";

const VALIDATION_ALERT_DEBOUNCE_MS = 1200;
let lastValidationAlertMessage = "";
let lastValidationAlertAt = 0;

const PART_TEXT_LIMIT = 70;
const SUBMITTING_ATTR = "data-action-form-submitting";

function setClientValidationError(message) {
  if (!message) return;

  const now = Date.now();
  const shouldSkipDuplicate =
    message === lastValidationAlertMessage &&
    now - lastValidationAlertAt < VALIDATION_ALERT_DEBOUNCE_MS;
  if (shouldSkipDuplicate) return;

  lastValidationAlertMessage = message;
  lastValidationAlertAt = now;
  showAlert({
    type: "warning",
    message,
  });
}

function initActionFormRequiredValidation() {
  const form = document.getElementById("leftForm");
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.requiredValidationInit === "true") return;
  form.dataset.requiredValidationInit = "true";

  const markSubmitInProgress = () => {
    form.setAttribute(SUBMITTING_ATTR, "true");
  };

  const clearSubmitInProgress = () => {
    form.removeAttribute(SUBMITTING_ATTR);
  };

  const updatePartWordCounters = () => {
    [1, 2, 3].forEach((partNumber) => {
      const textKey = `texte_partie_${partNumber}`;
      const textInput = form.querySelector(`#input_${textKey}`);
      const counter = form.querySelector(`[data-word-count-for="${textKey}"]`);
      if (!(textInput instanceof HTMLTextAreaElement) || !(counter instanceof HTMLElement)) {
        return;
      }

      const words = textInput.value.trim()
        ? textInput.value.trim().split(/\s+/).filter(Boolean).length
        : 0;
      counter.textContent = `${words}/${PART_TEXT_LIMIT} mots`;
      counter.classList.toggle("text-error", words > PART_TEXT_LIMIT);
    });
  };

  updatePartWordCounters();
  form.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.id?.startsWith("input_texte_partie_")) {
      updatePartWordCounters();
    }
  });

  form.addEventListener("submit", (event) => {
    clearSubmitInProgress();

    if (event.defaultPrevented) return;

    const submitter = event.submitter;
    const submitterName =
      submitter instanceof HTMLButtonElement ||
      submitter instanceof HTMLInputElement
        ? submitter.name
        : "";
    const isDraftSave = submitterName === "save_as";
    const isPublishSubmit = submitterName === "publish_action";
    const isEditDraftSubmit =
      form.getAttribute("data-form-mode") === "edit" &&
      form.getAttribute("data-is-draft") === "true" &&
      !isPublishSubmit;

    if (isDraftSave || isEditDraftSubmit) {
      markSubmitInProgress();
      setClientValidationError("");
      return;
    }

    const overLimitFields = getOverLimitPartTextFieldsFromForm(form, PART_TEXT_LIMIT);
    if (overLimitFields.length > 0) {
      clearSubmitInProgress();
      event.preventDefault();
      setClientValidationError(
        buildWordLimitMessage(overLimitFields, PART_TEXT_LIMIT),
      );

      const firstOverLimitField = overLimitFields[0];
      if (typeof firstOverLimitField === "string") {
        const firstOverLimitInput = form.querySelector(
          `#input_${firstOverLimitField}`,
        );
        if (firstOverLimitInput instanceof HTMLTextAreaElement) {
          firstOverLimitInput.focus();
        }
      }
      return;
    }

    const missingHeaderFields = getMissingHeaderFields(form);
    const missingPart = !hasAtLeastOnePart(form);
    if (missingHeaderFields.length > 0 || missingPart) {
      clearSubmitInProgress();
      event.preventDefault();
      setClientValidationError(
        buildRequiredMessage(missingHeaderFields, missingPart),
      );

      if (missingHeaderFields.includes("titre")) {
        const titleInput = form.querySelector("#input_titre");
        if (
          titleInput instanceof HTMLInputElement ||
          titleInput instanceof HTMLTextAreaElement
        ) {
          titleInput.focus();
        }
        return;
      }

      if (missingHeaderFields.includes("date de début")) {
        const startDateInput = form.querySelector("#input_date_debut");
        if (startDateInput instanceof HTMLInputElement) startDateInput.focus();
        return;
      }

      if (missingHeaderFields.includes("image de l'en-tête")) {
        const heroInput = form.querySelector("#input_hero_file");
        if (heroInput instanceof HTMLInputElement) heroInput.focus();
        return;
      }

      if (missingHeaderFields.includes("type d'action")) {
        const typeActionToggle = form.querySelector(
          '[data-select-id="input_type_action"] [data-kc-ms-toggle]',
        );
        if (typeActionToggle instanceof HTMLButtonElement) {
          typeActionToggle.focus();
        }
        return;
      }

      if (missingPart) {
        const firstPartText = form.querySelector("#input_texte_partie_1");
        if (
          firstPartText instanceof HTMLTextAreaElement ||
          firstPartText instanceof HTMLInputElement
        ) {
          firstPartText.focus();
        }
      }
      return;
    }

    markSubmitInProgress();
    setClientValidationError("");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initActionFormRequiredValidation, {
    once: true,
  });
} else {
  initActionFormRequiredValidation();
}

document.addEventListener("astro:page-load", initActionFormRequiredValidation);

export {
  initActionFormRequiredValidation,
  setClientValidationError,
  buildRequiredMessage,
  getMissingHeaderFields,
  hasAtLeastOnePart,
  isEditDraftContext,
};
