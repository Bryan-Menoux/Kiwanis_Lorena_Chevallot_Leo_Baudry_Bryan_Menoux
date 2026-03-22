const AUTOSAVE_DELAY_MS = 700;
const AUTOSAVE_STATUS_DEFAULT = "Brouillon non enregistré";
const AUTOSAVE_STATUS_PENDING = "Enregistrement automatique en cours...";
const AUTOSAVE_STATUS_SUCCESS_NEW = "Brouillon créé";
const AUTOSAVE_STATUS_SUCCESS_UPDATE = "Brouillon enregistré";
const AUTOSAVE_STATUS_ERROR = "Enregistrement automatique impossible";

function setStatus(statusNode, message, tone = "default") {
  if (!(statusNode instanceof HTMLElement)) return;

  statusNode.textContent = message;
  statusNode.classList.remove("text-error", "text-success", "text-warning");
  if (tone === "error") {
    statusNode.classList.add("text-error");
  } else if (tone === "success") {
    statusNode.classList.add("text-success");
  } else if (tone === "pending") {
    statusNode.classList.add("text-warning");
  }
}

function initActionFormAutoDraftAutosave() {
  const form = document.getElementById("leftForm");
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.formMode !== "create") return;
  if (form.dataset.autodraftAutosaveInit === "true") return;
  form.dataset.autodraftAutosaveInit = "true";

  const draftIdInput = form.querySelector('[data-autodraft-id][name="draft_id"]');
  const statusNode = form.querySelector("[data-autodraft-status]");

  let saveTimer = null;
  let inFlight = false;
  let pendingChanges = false;
  let changeSequence = 0;
  let saveRequestedWhileBusy = false;

  const getCurrentDraftId = () =>
    draftIdInput instanceof HTMLInputElement ? draftIdInput.value.trim() : "";

  const setCurrentDraftId = (value) => {
    if (!(draftIdInput instanceof HTMLInputElement)) return;
    draftIdInput.value = value || "";
    if (value) {
      form.dataset.autodraftId = value;
    } else {
      delete form.dataset.autodraftId;
    }
  };

  const scheduleAutosave = () => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void triggerAutosaveIfIdle();
    }, AUTOSAVE_DELAY_MS);
    setStatus(statusNode, AUTOSAVE_STATUS_PENDING, "pending");
  };

  const triggerAutosaveIfIdle = async () => {
    if (!pendingChanges) return;
    if (inFlight) {
      saveRequestedWhileBusy = true;
      return;
    }

    const idleFor = Date.now() - lastChangeAt;
    if (idleFor < AUTOSAVE_DELAY_MS) {
      scheduleAutosave();
      return;
    }

    await runAutosave();
  };

  const buildPayload = () => {
    const formData = new FormData(form);
    formData.set("save_as", "brouillon");
    formData.set("autosave", "true");
    const draftId = getCurrentDraftId();
    if (draftId) {
      formData.set("draft_id", draftId);
    }
    return formData;
  };

  let lastChangeAt = 0;

  const postAutosave = async (transport = "fetch") => {
    const actionUrl = form.action || window.location.pathname;
    const payload = buildPayload();

    if (transport === "beacon" && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(actionUrl, payload);
      return { ok: true, draftId: getCurrentDraftId(), isNewDraft: !getCurrentDraftId() };
    }

    const response = await fetch(actionUrl, {
      method: "POST",
      body: payload,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok || !responsePayload || responsePayload.ok !== true || !responsePayload.draftId) {
      throw new Error(responsePayload?.error || "Autosave failed");
    }

    return responsePayload;
  };

  const runAutosave = async (transport = "fetch") => {
    if (inFlight) {
      saveRequestedWhileBusy = true;
      return;
    }

    const sequenceAtStart = changeSequence;
    inFlight = true;
    try {
      const payload = await postAutosave(transport);

      setCurrentDraftId(String(payload.draftId));
      setStatus(
        statusNode,
        payload.isNewDraft ? AUTOSAVE_STATUS_SUCCESS_NEW : AUTOSAVE_STATUS_SUCCESS_UPDATE,
        "success",
      );
      if (changeSequence === sequenceAtStart) {
        pendingChanges = false;
      }
    } catch (error) {
      console.debug(error);
      setStatus(statusNode, AUTOSAVE_STATUS_ERROR, "error");
    } finally {
      inFlight = false;
      if (saveRequestedWhileBusy) {
        saveRequestedWhileBusy = false;
        if (pendingChanges && !saveTimer) {
          void triggerAutosaveIfIdle();
        }
      }
    }
  };

  const saveNow = async (options = {}) => {
    clearTimeout(saveTimer);
    saveTimer = null;
    pendingChanges = true;
    return runAutosave(options.transport || "fetch");
  };

  const discardNow = async () => {
    clearTimeout(saveTimer);
    saveTimer = null;

    const actionUrl = form.action || window.location.pathname;
    const payload = buildPayload();
    payload.set("discard_draft", "true");

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
      throw new Error(responsePayload?.error || "Discard failed");
    }

    pendingChanges = false;
    changeSequence += 1;
    setCurrentDraftId("");
    setStatus(statusNode, AUTOSAVE_STATUS_DEFAULT);
    return responsePayload;
  };

  const onModified = () => {
    pendingChanges = true;
    changeSequence += 1;
    lastChangeAt = Date.now();
    scheduleAutosave();
  };

  const onSubmit = () => {
    clearTimeout(saveTimer);
  };

  setStatus(statusNode, AUTOSAVE_STATUS_DEFAULT);

  form.addEventListener("input", onModified);
  form.addEventListener("change", onModified);
  form.addEventListener("kc:action-form-modified", onModified);
  form.addEventListener("submit", onSubmit);

  window.__actionFormAutoDraft = {
    saveNow,
    discardNow,
    isDirty: () => pendingChanges || Boolean(getCurrentDraftId()),
    hasPendingChanges: () => pendingChanges,
    getDraftId: getCurrentDraftId,
    setDraftId: setCurrentDraftId,
    markClean: () => {
      pendingChanges = false;
      setStatus(statusNode, AUTOSAVE_STATUS_DEFAULT);
    },
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initActionFormAutoDraftAutosave, {
    once: true,
  });
} else {
  initActionFormAutoDraftAutosave();
}

document.addEventListener("astro:page-load", initActionFormAutoDraftAutosave);

export { initActionFormAutoDraftAutosave };
