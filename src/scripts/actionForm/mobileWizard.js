import { showAlert } from "../../utils/alerts";
import { scrollToTarget } from "../../utils/scroll.js";
const MOBILE_QUERY = "(max-width: 1023px)";
const TOTAL_STEPS = 7;
const INIT_FLAG_ATTR = "data-mobile-wizard-init";
const SYNC_FN_KEY = "__kcMobileWizardSync";
const CLEANUP_FN_KEY = "__kcMobileWizardCleanup";
const RESET_FN_KEY = "__kcMobileWizardReset";
const ASTRO_PAGE_LOAD_FLAG = "__kcMobileWizardPageLoadBound";
const VALIDATION_ALERT_DEBOUNCE_MS = 1200;
const FOOTER_OFFSET_CSS_VAR = "--mobile-wizard-footer-offset";
let lastWizardErrorMessage = "";
let lastWizardErrorAt = 0;

// Force une étape valide entre 1 et TOTAL_STEPS.
function parseStep(value, fallback = 1) {
  const n = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(TOTAL_STEPS, Math.max(1, n));
}

function getStorageKey(form) {
  const key = form?.dataset?.wizardStorageKey || "new";
  // Une clé dédiée par enregistrement évite de mélanger les progressions.
  return `kc_action_wizard_step_${key}`;
}

// Affiche uniquement la section correspondant à l'étape courante.
function setStepVisibility(form, step) {
  const wrappers = Array.from(
    form.querySelectorAll("[data-mobile-step-wrapper]"),
  );
  wrappers.forEach((wrapper) => {
    const wrapperStep = parseStep(wrapper.getAttribute("data-mobile-step"), 1);
    const shouldShow = wrapperStep === step;
    wrapper.classList.toggle("hidden", !shouldShow);
  });
}

function setNavState(form, step) {
  const stepLabel = form.querySelector("[data-mobile-step-label]");
  if (stepLabel) stepLabel.textContent = `Étape ${step}/7`;

  const prevButton = form.querySelector("[data-mobile-prev]");
  if (prevButton instanceof HTMLButtonElement) {
    prevButton.disabled = step === 1;
  }

  const nextButton = form.querySelector("[data-mobile-next]");
  if (nextButton instanceof HTMLButtonElement) {
    nextButton.classList.toggle("hidden", step === TOTAL_STEPS);
  }

  const submitButton = form.querySelector("[data-mobile-submit]");
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.classList.toggle("hidden", step !== TOTAL_STEPS);
  }

  const quickStepButtons = Array.from(
    form.querySelectorAll("[data-mobile-go-step]"),
  );
  // Le style de chaque pastille reflète l'étape active.
  quickStepButtons.forEach((button) => {
    const targetStep = parseStep(button.getAttribute("data-mobile-go-step"), 1);
    const isActive = targetStep === step;
    button.classList.toggle("bg-base-100", isActive);
    button.classList.toggle("text-accent", isActive);
    button.classList.toggle("border-base-100/30", !isActive);
    button.classList.toggle("text-base-100/60", !isActive);
  });
}

function setError(form, message) {
  const errorNode = form.querySelector("[data-mobile-step-error]");
  if (errorNode) {
    // Le message intégré est désactivé : on utilise le composant d'alerte.
    errorNode.classList.add("hidden");
    errorNode.textContent = "";
  }
  if (!message) {
    return;
  }

  const now = Date.now();
  const shouldSkipDuplicate =
    message === lastWizardErrorMessage &&
    now - lastWizardErrorAt < VALIDATION_ALERT_DEBOUNCE_MS;
  if (shouldSkipDuplicate) return;

  lastWizardErrorMessage = message;
  lastWizardErrorAt = now;
  showAlert({
    type: "warning",
    message,
  });
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

function getMissingHeaderFields(form) {
  const missingFields = [];

  const titleInput = form.querySelector("#input_titre");
  const hasTitle =
    titleInput instanceof HTMLInputElement &&
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

function shouldSkipStepValidationForDraftFlow(form) {
  return isEditDraftContext(form);
}

function isDraftSubmitAction(form, submitterName) {
  if (submitterName === "save_as") return true;
  return isEditDraftContext(form) && submitterName !== "publish_action";
}
function validateStep(form, step) {
  const currentStep = form.querySelector(
    `[data-mobile-step="${step}"][data-mobile-step-wrapper]`,
  );
  if (!(currentStep instanceof HTMLElement)) return true;

  if (step === 1) {
    const missingHeaderFields = getMissingHeaderFields(form);
    if (missingHeaderFields.length > 0) {
      setError(form, buildStepOneRequiredMessage(missingHeaderFields));
      if (missingHeaderFields.includes("titre")) {
        const titleInput = form.querySelector("#input_titre");
        titleInput?.focus?.();
      } else if (missingHeaderFields.includes("date de début")) {
        const startDateInput = form.querySelector("#input_date_debut");
        startDateInput?.focus?.();
      } else if (missingHeaderFields.includes("image de l'en-tête")) {
        const heroInput = form.querySelector("#input_hero_file");
        heroInput?.focus?.();
      } else if (missingHeaderFields.includes("type d'action")) {
        const typeActionToggle = form.querySelector(
          '[data-select-id="input_type_action"] [data-kc-ms-toggle]',
        );
        typeActionToggle?.focus?.();
      }
      return false;
    }
  }

  const invalidElement = Array.from(
    currentStep.querySelectorAll("input, textarea, select"),
  ).find((field) => field instanceof HTMLElement && "checkValidity" in field && !field.checkValidity());

  if (invalidElement instanceof HTMLElement) {
    invalidElement.reportValidity?.();
    setError(
      form,
      "Certains champs de cette étape ne sont pas valides. Corrigez-les puis réessayez.",
    );
    return false;
  }

  setError(form, "");
  return true;
}

function persistStep(form, step) {
  try {
    // Erreur de storage non bloquante : on continue sans casser l'UI.
    localStorage.setItem(getStorageKey(form), String(step));
  } catch (e) {}
}

function initMobileWizard() {
  const formFromShell = document.querySelector(
    "[data-action-editor-shell] #leftForm",
  );
  const fallbackForm = document.getElementById("leftForm");
  const form =
    formFromShell instanceof HTMLFormElement
      ? formFromShell
      : fallbackForm instanceof HTMLFormElement
        ? fallbackForm
        : null;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.uiMode !== "mobile-wizard") return;

  // Idempotence : si déjà initialisé, on resynchronise sans réattacher tous les écouteurs.
  const storedSync = form[SYNC_FN_KEY];
  if (form.getAttribute(INIT_FLAG_ATTR) === "true" && typeof storedSync === "function") {
    const storedReset = form[RESET_FN_KEY];
    if (typeof storedReset === "function") {
      storedReset();
    }
    storedSync();
    return;
  }

  const storedCleanup = form[CLEANUP_FN_KEY];
  if (typeof storedCleanup === "function") {
    storedCleanup();
  }
  form.setAttribute(INIT_FLAG_ATTR, "true");

  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  const initialFromMarkup = parseStep(form.dataset.initialStep || "1", 1);
  let currentStep = initialFromMarkup;
  const wizardHeader = form.querySelector("[data-mobile-wizard-header]");
  const wizardFooter = form.querySelector("[data-mobile-wizard-footer]");

  const syncFooterOffset = () => {
    if (!mediaQuery.matches || !(wizardFooter instanceof HTMLElement)) {
      form.style.setProperty(FOOTER_OFFSET_CSS_VAR, "0px");
      return;
    }
    const footerHeight = wizardFooter.offsetHeight;
    // Keep the current step content fully visible above the sticky footer.
    form.style.setProperty(FOOTER_OFFSET_CSS_VAR, `${Math.max(0, footerHeight + 12)}px`);
  };

  const sync = () => {
    const isMobile = mediaQuery.matches;
    // Sécurité : une étape valide est conservée même après resize.
    currentStep = parseStep(currentStep, initialFromMarkup);
    form.dataset.isMobileWizard = isMobile ? "true" : "false";

    if (wizardHeader instanceof HTMLElement) {
      wizardHeader.classList.toggle("hidden", !isMobile);
    }
    if (wizardFooter instanceof HTMLElement) {
      wizardFooter.classList.toggle("hidden", !isMobile);
    }

    const stepWrappers = Array.from(
      form.querySelectorAll("[data-mobile-step-wrapper]"),
    );
    if (!isMobile) {
      // En desktop/tablette large, on repasse en affichage complet.
      stepWrappers.forEach((wrapper) => wrapper.classList.remove("hidden"));
      setError(form, "");
      syncFooterOffset();
      return;
    }

    setStepVisibility(form, currentStep);
    setNavState(form, currentStep);
    syncFooterOffset();
  };

  const forceFormTab = () => {
    const shell = form.closest("[data-action-editor-shell]");
    if (!(shell instanceof HTMLElement)) return;
    shell.dataset.activeTab = "form";
    const formTabButton = shell.querySelector('[data-shell-tab-trigger="form"]');
    if (formTabButton instanceof HTMLElement) {
      formTabButton.click();
    }
  };

  const resetToFirstStep = () => {
    currentStep = 1;
    persistStep(form, currentStep);
    setError(form, "");
    if (mediaQuery.matches) {
      forceFormTab();
      setStepVisibility(form, currentStep);
      setNavState(form, currentStep);
      syncFooterOffset();
    }
  };

  const goToStep = (nextStep, shouldValidateCurrent = false) => {
    const safeStep = parseStep(nextStep, currentStep);
    if (safeStep === currentStep) return;
    // La validation n'est bloquante que lors d'une avancée volontaire.
    const shouldSkipValidation = shouldSkipStepValidationForDraftFlow(form);
    if (
      mediaQuery.matches &&
      shouldValidateCurrent &&
      !shouldSkipValidation &&
      !validateStep(form, currentStep)
    ) {
      return;
    }
    currentStep = safeStep;
    persistStep(form, currentStep);
    setError(form, "");
    if (mediaQuery.matches) {
      setStepVisibility(form, currentStep);
      setNavState(form, currentStep);
      syncFooterOffset();
      // Sur mobile, on replace le haut du formulaire en vue à chaque changement d'étape.
      scrollToTarget(0);
    }
  };

  const prevButton = form.querySelector("[data-mobile-prev]");
  const nextButton = form.querySelector("[data-mobile-next]");
  const prevHandler = () => goToStep(currentStep - 1);
  const nextHandler = () => {
    goToStep(currentStep + 1, true);
  };
  if (prevButton instanceof HTMLButtonElement) {
    prevButton.addEventListener("click", prevHandler);
  }
  if (nextButton instanceof HTMLButtonElement) {
    nextButton.addEventListener("click", nextHandler);
  }

  const quickStepButtons = Array.from(
    form.querySelectorAll("[data-mobile-go-step]"),
  );
  const quickStepHandlers = new Map();
  quickStepButtons.forEach((button) => {
    const handler = () => {
      const target = parseStep(button.getAttribute("data-mobile-go-step"), 1);
      const isForward = target > currentStep;
      goToStep(target, isForward);
    };
    quickStepHandlers.set(button, handler);
    button.addEventListener("click", handler);
  });

  const submitHandler = (event) => {
    if (!mediaQuery.matches) return;
    const submitterName = event.submitter?.name || "";
    const isPublishSubmit = submitterName === "publish_action";
    const isDraftSave = isDraftSubmitAction(form, submitterName);
    if (isDraftSave) {
      setError(form, "");
      persistStep(form, currentStep);
      return;
    }

    // Hors brouillon, seule la publication peut partir hors étape 7.
    if (currentStep !== TOTAL_STEPS && !isPublishSubmit) {
      event.preventDefault();
      setError(form, "Passe à l'étape 7 pour enregistrer l'action.");
      return;
    }
    if (!validateStep(form, currentStep)) {
      event.preventDefault();
      return;
    }
    persistStep(form, currentStep);
  };
  form.addEventListener("submit", submitHandler);

  const mediaChangeHandler = () => sync();
  mediaQuery.addEventListener("change", mediaChangeHandler);
  const pageShowHandler = () => resetToFirstStep();
  window.addEventListener("pageshow", pageShowHandler);
  const viewportResizeHandler = () => syncFooterOffset();
  window.addEventListener("resize", viewportResizeHandler);
  const footerResizeObserver =
    wizardFooter instanceof HTMLElement && typeof ResizeObserver === "function"
      ? new ResizeObserver(() => syncFooterOffset())
      : null;
  if (footerResizeObserver && wizardFooter instanceof HTMLElement) {
    footerResizeObserver.observe(wizardFooter);
  }

  form[SYNC_FN_KEY] = sync;
  form[RESET_FN_KEY] = resetToFirstStep;
  form[CLEANUP_FN_KEY] = () => {
    // Fonction de nettoyage appelée avant un éventuel rebind.
    if (prevButton instanceof HTMLButtonElement) {
      prevButton.removeEventListener("click", prevHandler);
    }
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.removeEventListener("click", nextHandler);
    }
    quickStepButtons.forEach((button) => {
      const handler = quickStepHandlers.get(button);
      if (!handler) return;
      button.removeEventListener("click", handler);
    });
    form.removeEventListener("submit", submitHandler);
    mediaQuery.removeEventListener("change", mediaChangeHandler);
    window.removeEventListener("pageshow", pageShowHandler);
    window.removeEventListener("resize", viewportResizeHandler);
    if (footerResizeObserver) {
      footerResizeObserver.disconnect();
    }
    form.style.setProperty(FOOTER_OFFSET_CSS_VAR, "0px");
  };

  resetToFirstStep();
  sync();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileWizard, { once: true });
} else {
  initMobileWizard();
}

if (!window[ASTRO_PAGE_LOAD_FLAG]) {
  // Avec le routeur Astro, la page peut se recharger sans rechargement complet.
  document.addEventListener("astro:page-load", initMobileWizard);
  window[ASTRO_PAGE_LOAD_FLAG] = true;
}

