const MOBILE_QUERY = "(max-width: 1023px)";
const TOTAL_STEPS = 7;
const INIT_FLAG_ATTR = "data-mobile-wizard-init";
const SYNC_FN_KEY = "__kcMobileWizardSync";
const CLEANUP_FN_KEY = "__kcMobileWizardCleanup";
const ASTRO_PAGE_LOAD_FLAG = "__kcMobileWizardPageLoadBound";

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
  if (!errorNode) return;
  if (!message) {
    errorNode.classList.add("hidden");
    errorNode.textContent = "";
    return;
  }

  errorNode.classList.remove("hidden");
  errorNode.textContent = message;
}

function validateStep(form, step) {
  const currentStep = form.querySelector(
    `[data-mobile-step="${step}"][data-mobile-step-wrapper]`,
  );
  if (!(currentStep instanceof HTMLElement)) return true;

  if (step === 1) {
    // Règle métier minimale : le titre est obligatoire hors brouillon.
    const titleInput = form.querySelector("#input_titre");
    if (
      titleInput instanceof HTMLInputElement &&
      titleInput.value.trim().length === 0
    ) {
      titleInput.reportValidity();
      setError(form, "Le titre de l'action est obligatoire.");
      return false;
    }
  }

  const invalidElement = Array.from(
    currentStep.querySelectorAll("input, textarea, select"),
  ).find((field) => field instanceof HTMLElement && "checkValidity" in field && !field.checkValidity());

  if (invalidElement instanceof HTMLElement) {
    invalidElement.reportValidity?.();
    setError(form, "Certains champs de cette étape sont invalides.");
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

function readPersistedStep(form, fallback) {
  try {
    return parseStep(localStorage.getItem(getStorageKey(form)), fallback);
  } catch (e) {
    return fallback;
  }
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

  // Idempotence : si déjà initialisé, on resynchronise sans rebinder tous les listeners.
  const storedSync = form[SYNC_FN_KEY];
  if (form.getAttribute(INIT_FLAG_ATTR) === "true" && typeof storedSync === "function") {
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
  let currentStep = readPersistedStep(form, initialFromMarkup);

  const sync = () => {
    const isMobile = mediaQuery.matches;
    // Sécurité : une étape valide est conservée même après resize.
    currentStep = parseStep(currentStep, initialFromMarkup);
    form.dataset.isMobileWizard = isMobile ? "true" : "false";

    const wizardHeader = form.querySelector("[data-mobile-wizard-header]");
    const wizardFooter = form.querySelector("[data-mobile-wizard-footer]");
    if (wizardHeader) wizardHeader.classList.toggle("hidden", !isMobile);
    if (wizardFooter) wizardFooter.classList.toggle("hidden", !isMobile);

    const stepWrappers = Array.from(
      form.querySelectorAll("[data-mobile-step-wrapper]"),
    );
    if (!isMobile) {
      // En desktop/tablette large, on repasse en affichage complet.
      stepWrappers.forEach((wrapper) => wrapper.classList.remove("hidden"));
      setError(form, "");
      return;
    }

    setStepVisibility(form, currentStep);
    setNavState(form, currentStep);
  };

  const goToStep = (nextStep, shouldValidateCurrent = false) => {
    const safeStep = parseStep(nextStep, currentStep);
    if (safeStep === currentStep) return;
    // La validation n'est bloquante que lors d'une avancée volontaire.
    if (mediaQuery.matches && shouldValidateCurrent && !validateStep(form, currentStep)) {
      return;
    }
    currentStep = safeStep;
    persistStep(form, currentStep);
    setError(form, "");
    if (mediaQuery.matches) {
      setStepVisibility(form, currentStep);
      setNavState(form, currentStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    // Les actions "brouillon" / "publication" restent possibles hors étape 7.
    const isDraftOrPublish = submitterName === "save_as" || submitterName === "publish_action";
    if (currentStep !== TOTAL_STEPS && !isDraftOrPublish) {
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

  form[SYNC_FN_KEY] = sync;
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
  };

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
