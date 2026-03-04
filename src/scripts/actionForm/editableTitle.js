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

    // Le champ est masqué par défaut : on affiche d'abord la version "lecture".
    input.style.display = "none";
    btn.dataset.editing = "false";

    const rawPlaceholder =
      input.dataset.example ||
      (input.getAttribute("placeholder") || h4.textContent?.trim() || "").replace(/^Ex :\s*/i, "");
    const displayPlaceholder = "Ex : " + rawPlaceholder;
    const getDisplayText = (value) => String(value || "").trim() || rawPlaceholder;
    const setLinkedLabels = (value) => {
      // Plusieurs labels affichent le même titre (cartes/form). On les met à jour ensemble.
      const labelText = getDisplayText(value);
      h4.textContent = labelText;
      document.querySelectorAll(`[data-label-for="${target}"]`).forEach((el) => {
        el.textContent = labelText;
      });
    };
    const syncPreview = () => {
      // La prévisualisation écoute l'événement `input` : on le réémet après annulation.
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    if (!h4.textContent?.trim() || h4.textContent.trim() === rawPlaceholder) {
      h4.textContent = rawPlaceholder;
    }
    input.setAttribute("placeholder", displayPlaceholder);

    let valueBeforeEdit = hidden.value || "";
    if (!valueBeforeEdit && h4.textContent?.trim() && h4.textContent.trim() !== rawPlaceholder) {
      valueBeforeEdit = h4.textContent.trim();
      hidden.value = valueBeforeEdit;
    }
    input.value = valueBeforeEdit;
    setLinkedLabels(valueBeforeEdit);

    const setEditState = (isEditing, shouldSave = false) => {
      if (isEditing) {
        // Entrée en édition : on garde une copie pour pouvoir annuler sans perte.
        valueBeforeEdit = hidden.value || "";
        h4.style.display = "none";
        input.style.display = "";
        input.value = valueBeforeEdit;
        input.focus();
        btn.textContent = "Valider";
        btn.dataset.editing = "true";
        btn.setAttribute("aria-pressed", "true");
      } else {
        input.style.display = "none";
        h4.style.display = "";
        if (shouldSave) {
          // Validation : hidden + labels sont alignés sur la nouvelle valeur.
          hidden.value = input.value;
          setLinkedLabels(input.value);
        } else {
          // Annulation : restauration stricte de l'état initial.
          hidden.value = valueBeforeEdit;
          input.value = valueBeforeEdit;
          setLinkedLabels(valueBeforeEdit);
          syncPreview();
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
        cancelBtn.style.display = "none";
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditState(false, false);
        cancelBtn.style.display = "none";
      }
    });
  });
});
