import PREVIEW_DEFAULTS from "../previewDefaults.js";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-edit-target]").forEach((btn) => {
    const target = btn.getAttribute("data-edit-target");
    if (!target) return;

    const input = document.getElementById("input_" + target);
    const hidden = document.getElementById("hidden_" + target);
    const h4 = document.getElementById("titre_label_" + target.replace(/^titre_/, ""));

    if (!(input instanceof HTMLInputElement)) return;
    if (!(hidden instanceof HTMLInputElement)) return;
    if (!(h4 instanceof HTMLElement)) return;
    if (!(btn instanceof HTMLElement)) return;

    const example = PREVIEW_DEFAULTS[target] || input.dataset.example || "";
    if (example) input.dataset.example = example;

    input.style.display = "none";
    btn.dataset.editing = "false";

    const rawPlaceholder =
      input.dataset.example ||
      (input.getAttribute("placeholder") || h4.textContent?.trim() || "").replace(/^Ex :\s*/i, "");
    const displayPlaceholder = "Ex : " + rawPlaceholder;

    if (!h4.textContent?.trim() || h4.textContent.trim() === rawPlaceholder) {
      h4.textContent = rawPlaceholder;
    }
    input.setAttribute("placeholder", displayPlaceholder);

    document.querySelectorAll(`[data-label-for="${target}"]`).forEach((el) => {
      el.textContent = h4.textContent?.trim() || rawPlaceholder;
    });

    const setEditState = (isEditing, shouldSave = false) => {
      if (isEditing) {
        h4.style.display = "none";
        input.style.display = "";
        input.value =
          hidden.value ||
          (h4.textContent?.trim() === rawPlaceholder ? "" : h4.textContent?.trim() || "");
        input.focus();
        btn.textContent = "Valider";
        btn.dataset.editing = "true";
        btn.setAttribute("aria-pressed", "true");
      } else {
        input.style.display = "none";
        h4.style.display = "";
        if (shouldSave) {
          hidden.value = input.value;
          h4.textContent = input.value || rawPlaceholder;
          document.querySelectorAll(`[data-label-for="${target}"]`).forEach((el) => {
            el.textContent = input.value || rawPlaceholder;
          });
        }
        btn.textContent = "Modifier le titre de la section";
        btn.dataset.editing = "false";
        btn.setAttribute("aria-pressed", "false");
      }
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-ghost rounded-md! h-full px-2 py-1 bg-base-100 ml-2";
    cancelBtn.textContent = "Annuler";
    cancelBtn.style.display = "none";
    btn.parentNode?.insertBefore(cancelBtn, btn.nextSibling);

    btn.addEventListener("click", () => {
      if (btn.dataset.editing === "false") {
        setEditState(true, false);
        cancelBtn.style.display = "";
      } else {
        setEditState(false, true);
        cancelBtn.style.display = "none";
      }
    });

    cancelBtn.addEventListener("click", () => {
      setEditState(false, false);
      cancelBtn.style.display = "none";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setEditState(false, true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditState(false, false);
      }
    });
  });
});
