/**
 * Utilitaires pour la gestion des formulaires de publication/suppression
 * Utilisés dans les pages de création (actions, projets, etc.)
 */

export interface PublishFormConfig {
  formSelector?: string;
  overlayIdPattern?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_CONFIG: PublishFormConfig = {
  formSelector: 'form[data-publish-action-form="true"]',
  overlayIdPattern: "publish",
  confirmTitle: "Publier l'élément",
  confirmMessage: "Confirmez la publication de cet élément. Cette action sera visible publiquement sur le site.",
  confirmLabel: "Publier",
  cancelLabel: "Annuler",
};

/**
 * Ferme les overlays de publication en cas d'erreur/succès
 */
export function closePublishOverlay(config: Partial<PublishFormConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const params = new URLSearchParams(window.location.search);
  if (!params.has("error") && !params.has("success")) return;

  document.querySelectorAll(finalConfig.formSelector || DEFAULT_CONFIG.formSelector!).forEach((form) => {
    if (form instanceof HTMLFormElement) {
      [
        "data-submit-overlay-pending",
        "data-submit-overlay-in-flight",
        "data-submit-overlay-keep-visible",
        "data-submit-overlay-fallback-token",
      ].forEach((attr) => form.removeAttribute(attr));
    }
  });

  const overlay = document.querySelector(`[data-submit-overlay-id*="${finalConfig.overlayIdPattern}"]`);
  if (overlay instanceof HTMLElement) {
    overlay.classList.toggle("hidden", true);
    overlay.classList.toggle("flex", false);
  }
}

/**
 * Initialise la validation des champs obligatoires avant submission
 */
export function initPublishValidation(config: Partial<PublishFormConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  document.addEventListener(
    "click",
    (evt) => {
      if (!(evt.target instanceof HTMLButtonElement) || evt.target.type !== "submit") return;

      const form = evt.target.closest(finalConfig.formSelector || DEFAULT_CONFIG.formSelector!);
      if (!form) return;

      const missingFields = (form.getAttribute("data-required-missing") || "")
        .split("||")
        .map((v) => v.trim())
        .filter(Boolean);

      if (!missingFields.length) return;

      evt.preventDefault();
      evt.stopPropagation();

      const parent = form.closest("[data-action-id]");
      const id = parent?.getAttribute("data-action-id");
      const slug = parent?.getAttribute("data-action-slug");

      if (id) {
        const msg = `Champs obligatoires manquants: ${missingFields.join(", ")}.`;
        window.location.replace(
          `${window.location.pathname}?validation_error=${encodeURIComponent(msg)}`
        );
      }
    },
    true
  );
}

/**
 * Initialise la confirmation avant publication
 */
export function initPublishConfirmation(
  config: Partial<PublishFormConfig> = {},
  showConfirmFn?: (options: any) => Promise<boolean>
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Utilise la fonction showConfirm si disponible, sinon utilise window.confirm
  const confirm = showConfirmFn || ((opts: any) => Promise.resolve(window.confirm(opts.message)));

  document.addEventListener("submit", (evt) => {
    if (
      !(evt.target instanceof HTMLFormElement) ||
      evt.target.getAttribute("data-publish-action-form") !== "true"
    )
      return;

    if (evt.target.getAttribute("data-publication-confirmed") === "true") {
      evt.target.removeAttribute("data-publication-confirmed");
      return;
    }

    evt.preventDefault();
    const form = evt.target;

    void confirm({
      title: finalConfig.confirmTitle,
      message: finalConfig.confirmMessage,
      type: "warning",
      confirmLabel: finalConfig.confirmLabel,
      cancelLabel: finalConfig.cancelLabel,
    }).then((ok) => {
      if (!ok) return;
      form.setAttribute("data-publication-confirmed", "true");
      form.requestSubmit(evt.submitter instanceof HTMLElement ? evt.submitter : undefined);
    });
  });
}

/**
 * Initialise tous les gestionnaires de publication
 */
export function initPublishHandlers(
  config: Partial<PublishFormConfig> = {},
  showConfirmFn?: (options: any) => Promise<boolean>
) {
  closePublishOverlay(config);
  initPublishValidation(config);
  initPublishConfirmation(config, showConfirmFn);
}
