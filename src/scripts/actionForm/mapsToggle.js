document.addEventListener("DOMContentLoaded", () => {
  const mapInput = document.getElementById("input_lien_lieu");
  const btn = document.getElementById("btn_voir_maps");
  if (!(mapInput instanceof HTMLInputElement) || !(btn instanceof HTMLElement)) return;

  // Le bouton "Voir sur Maps" doit être visible uniquement si l'URL est renseignée.
  const updateBtn = () => {
    const val = mapInput.value || "";
    if (val.trim()) {
      btn.setAttribute("href", val);
      btn.style.display = "";
    } else {
      btn.style.display = "none";
      btn.removeAttribute("href");
    }
  };

  updateBtn();
  mapInput.addEventListener("input", updateBtn);
  mapInput.addEventListener("change", updateBtn);

  const manualToggle = document.getElementById("manual_toggle_link");
  const manualContainer = document.getElementById("manual_lien_lieu_container");
  const manualInput = document.getElementById("manual_lien_lieu");

  if (!(manualToggle instanceof HTMLElement)) return;
  if (!(manualContainer instanceof HTMLElement)) return;
  if (!(manualInput instanceof HTMLInputElement)) return;

  manualToggle.addEventListener("click", (e) => {
    e.preventDefault();

    // On mémorise la valeur courante pour pouvoir annuler proprement.
    if (manualContainer.style.display === "none" || !manualContainer.style.display) {
      try {
        manualContainer.dataset.original = mapInput.value || "";
      } catch (err) {}

      manualContainer.style.display = "";
      manualInput.focus();
    } else {
      manualContainer.style.display = "none";
    }
  });

  const syncFromManual = () => {
    const v = manualInput.value || "";
    mapInput.value = v;
    // Les events gardent le preview et les hidden inputs synchronisés.
    mapInput.dispatchEvent(new Event("input", { bubbles: true }));
    mapInput.dispatchEvent(new Event("change", { bubbles: true }));
  };

  manualInput.addEventListener("input", syncFromManual);
  manualInput.addEventListener("change", syncFromManual);

  const validateBtn = document.getElementById("manual_validate_btn");
  const cancelBtn = document.getElementById("manual_cancel_btn");

  if (validateBtn instanceof HTMLElement) {
    validateBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      syncFromManual();

      // Message flash simple : la valeur est acceptée et réutilisable immédiatement.
      try {
        const popup = document.createElement("div");
        popup.textContent =
          "Adresse validée, vous pouvez refaire un test en cliquant sur le bouton 'Voir sur Maps'";
        popup.className =
          "block w-full min-h-8 flex items-center justify-center bg-green-600 text-white px-3 py-1 rounded";
        popup.style.display = "block";
        popup.style.marginTop = "0.5rem";

        manualContainer.parentNode?.insertBefore(popup, manualContainer.nextSibling);
        manualContainer.style.display = "none";

        setTimeout(() => {
          try {
            popup.remove();
          } catch (e) {}
        }, 4000);
      } catch (err) {
        manualContainer.style.display = "none";
      }
    });
  }

  if (cancelBtn instanceof HTMLElement) {
    cancelBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      // Annulation = restauration exacte de la valeur initiale.
      const orig = manualContainer.dataset.original || "";
      manualInput.value = orig;
      syncFromManual();
      manualContainer.style.display = "none";
    });
  }
});
