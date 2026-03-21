const TECHNICAL_FIELDS = new Set([
  "_action",
  "save_as",
  "publish_action",
  "draft_id",
  "autosave",
  "leave_after_save",
]);
const SUBMITTING_ATTR = "data-action-form-submitting";

function isLeavingLink(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  return true;
}

function findAnchorFromEventTarget(target) {
  let node = target instanceof Node ? target : null;
  while (node) {
    if (node instanceof HTMLAnchorElement) return node;
    node = node.parentNode;
  }
  return null;
}

function serializeFormForDirtyCheck(form) {
  const formData = new FormData(form);
  const entries = [];

  for (const [key, value] of formData.entries()) {
    if (TECHNICAL_FIELDS.has(key) || key.startsWith("remove_")) continue;

    if (value instanceof File) {
      entries.push(`${key}:file:${value.name}:${value.size}:${value.type}`);
    } else {
      entries.push(`${key}:${String(value)}`);
    }
  }

  return entries.join("|");
}

function initUnsavedChangesGuard() {
  const form = document.getElementById("leftForm");
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.unsavedGuardInit === "true") return;
  form.dataset.unsavedGuardInit = "true";

  const mode = form.dataset.formMode;
  if (mode !== "create" && mode !== "edit") return;

  const modal = document.getElementById("unsaved-changes-modal");
  const saveButton = modal?.querySelector("[data-unsaved-save]");
  const abandonButton = modal?.querySelector("[data-unsaved-abandon]");
  const cancelButton = modal?.querySelector("[data-unsaved-cancel]");
  const titleNode = modal?.querySelector("[data-unsaved-title]");
  const messageNode = modal?.querySelector("[data-unsaved-message]");
  const guard = window.__actionFormAutoDraft;

  if (!(modal instanceof HTMLDialogElement)) return;

  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  let pendingNavigation = null;
  let ignoreNextPopState = false;
  let historyGuardInstalled = false;
  let suppressBeforeUnloadOnce = false;
  let editInitialSignature = isEditMode ? serializeFormForDirtyCheck(form) : "";
  let editDirty = false;

  const refreshEditDirtyState = () => {
    if (!isEditMode) return;
    editDirty = serializeFormForDirtyCheck(form) !== editInitialSignature;
  };

  const markEditClean = () => {
    if (!isEditMode) return;
    editInitialSignature = serializeFormForDirtyCheck(form);
    editDirty = false;
  };

  const isFormDirty = () => {
    if (isCreateMode) {
      return Boolean(guard?.getDraftId?.()) || Boolean(guard?.hasPendingChanges?.());
    }

    return editDirty;
  };

  const isFormSubmitting = () =>
    form.getAttribute(SUBMITTING_ATTR) === "true" ||
    form.getAttribute("data-submit-overlay-in-flight") === "true";

  const closeModal = () => {
    if (modal.open) modal.close();
  };

  const resetNavigation = () => {
    pendingNavigation = null;
  };

  const openModal = (navigation) => {
    pendingNavigation = navigation || null;
    if (titleNode instanceof HTMLElement) {
      titleNode.textContent = "Quitter la page ?";
    }
    if (messageNode instanceof HTMLElement) {
      messageNode.textContent = isCreateMode
        ? "Vous pouvez enregistrer un brouillon avant de quitter, ou abandonner les modifications."
        : "Vous pouvez enregistrer les modifications avant de quitter, ou abandonner les changements.";
    }
    if (!modal.open) modal.showModal();
  };

  const continueNavigation = (navigation) => {
    const targetNavigation = navigation || pendingNavigation;
    if (!targetNavigation) return;

    suppressBeforeUnloadOnce = true;

    if (targetNavigation.type === "reload") {
      window.location.reload();
      return;
    }

    if (targetNavigation.type === "back") {
      ignoreNextPopState = true;
      window.history.go(-2);
      return;
    }

    if (targetNavigation.type === "link" && targetNavigation.href) {
      window.location.assign(targetNavigation.href);
    }
  };

  const installHistoryGuard = () => {
    if (historyGuardInstalled) return;
    historyGuardInstalled = true;

    try {
      const currentState = window.history.state;
      if (!currentState || currentState.kcActionFormGuard !== true) {
        window.history.pushState(
          {
            ...(currentState && typeof currentState === "object" ? currentState : {}),
            kcActionFormGuard: true,
          },
          "",
          window.location.href,
        );
      }
    } catch {
      // Si pushState échoue, on garde quand même les autres protections.
    }
  };

  const saveAndLeaveCreate = async () => {
    if (!(guard?.saveNow instanceof Function)) {
      throw new Error("Sauvegarde du brouillon indisponible.");
    }

    await guard.saveNow({ transport: "fetch" });
  };

  const saveAndLeaveEdit = async () => {
    const actionUrl = form.action || window.location.pathname;
    const payload = new FormData(form);
    payload.set("leave_after_save", "true");

    const response = await fetch(actionUrl, {
      method: "POST",
      body: payload,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok || !responsePayload || responsePayload.ok !== true) {
      throw new Error(responsePayload?.error || "Save failed");
    }

    markEditClean();
    return responsePayload;
  };

  installHistoryGuard();

  window.addEventListener("beforeunload", (event) => {
    if (suppressBeforeUnloadOnce) {
      suppressBeforeUnloadOnce = false;
      return;
    }

    if (!isFormDirty() || isFormSubmitting()) return;

    // Le navigateur interdit un modal custom au refresh/close, donc on utilise
    // la confirmation native pour couvrir la flèche d'actualisation aussi.
    event.preventDefault();
    event.returnValue = "";
    return "";
  });

  window.addEventListener(
    "click",
    (event) => {
      const anchor = findAnchorFromEventTarget(event.target);
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isLeavingLink(anchor)) return;
      if (!isFormDirty()) return;

      event.preventDefault();
      openModal({ type: "link", href: anchor.href });
    },
    true,
  );

  abandonButton?.addEventListener("click", () => {
    const navigation = pendingNavigation;

    if (isCreateMode) {
      const discard = guard?.discardNow;
      if (typeof discard === "function") {
        void discard()
          .catch(() => {})
          .finally(() => {
            closeModal();
            resetNavigation();
            void continueNavigation(navigation);
          });
        return;
      }
    }

    closeModal();
    resetNavigation();
    void continueNavigation(navigation);
  });

  cancelButton?.addEventListener("click", () => {
    closeModal();
    resetNavigation();
  });

  saveButton?.addEventListener("click", async () => {
    const navigation = pendingNavigation;

    try {
      if (isCreateMode) {
        await saveAndLeaveCreate();
      } else {
        await saveAndLeaveEdit();
      }
    } catch {
      // On garde le dialogue ouvert si la sauvegarde échoue.
      return;
    }

    closeModal();
    resetNavigation();
    void continueNavigation(navigation);
  });

  window.addEventListener("keydown", (event) => {
    const isReloadShortcut =
      event.key === "F5" ||
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
    if (!isReloadShortcut) return;
    if (!isFormDirty()) return;

    event.preventDefault();
    openModal({ type: "reload" });
  });

  window.addEventListener("popstate", () => {
    if (ignoreNextPopState) {
      ignoreNextPopState = false;
      return;
    }

    if (!isFormDirty()) {
      return;
    }

    openModal({ type: "back" });
    ignoreNextPopState = true;
    window.history.forward();
  });

  form.addEventListener("input", refreshEditDirtyState);
  form.addEventListener("change", refreshEditDirtyState);
  form.addEventListener("kc:action-form-modified", refreshEditDirtyState);
  form.addEventListener("submit", () => {
    if (isEditMode) {
      editInitialSignature = serializeFormForDirtyCheck(form);
      editDirty = false;
    }
  });

  modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal();
    resetNavigation();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUnsavedChangesGuard, {
    once: true,
  });
} else {
  initUnsavedChangesGuard();
}

document.addEventListener("astro:page-load", initUnsavedChangesGuard);

export { initUnsavedChangesGuard };
