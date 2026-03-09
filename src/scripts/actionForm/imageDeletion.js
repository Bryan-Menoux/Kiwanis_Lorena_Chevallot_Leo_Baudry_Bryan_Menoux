document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leftForm");
  if (!form) return;

  const imageFieldNames = ["hero", "photo_partie_1", "photo_partie_2", "photo_partie_3"];
  const imageDescriptionMap = {
    hero: "description_hero",
    photo_partie_1: "description_photo_partie_1",
    photo_partie_2: "description_photo_partie_2",
    photo_partie_3: "description_photo_partie_3",
  };
  const deletedImages = {};

  form.addEventListener("click", (e) => {
    // Délégation d'événement : un seul écouteur pour toutes les images supprimables.
    const target = e.target;
    const btn = target && target.closest ? target.closest(".delete-image-btn") : null;
    if (!btn) return;

    e.preventDefault();
    const container = btn.closest("[data-delete-image]");
    if (!container) return;

    const fieldName = container.getAttribute("data-delete-image");
    if (!fieldName) return;

    // On garde la trace de la suppression pour l'envoyer au submit.
    deletedImages[fieldName] = true;
    container.remove();

    const fileInput = form.querySelector(`[data-prop-file="${fieldName}"]`);
    if (fileInput) {
      fileInput.value = "";
      if (fileInput.__dt) fileInput.__dt = null;
    }

    document.querySelectorAll(`[data-field="${fieldName}"]`).forEach((el) => {
      if (el.tagName === "IMG") {
        el.src = "";
        el.style.display = "none";
      }
    });

    const descriptionFieldName = imageDescriptionMap[fieldName];
    if (descriptionFieldName) {
      // Si l'image disparaît, sa description ne doit plus s'afficher en preview.
      document.querySelectorAll(`[data-field="${descriptionFieldName}"]`).forEach((el) => {
        el.style.display = "none";
      });
    }
  });

  form.addEventListener("submit", () => {
    // Au submit, on génère remove_{champ} seulement si aucun nouveau fichier n'a remplacé l'ancien.
    imageFieldNames.forEach((fieldName) => {
      if (!deletedImages[fieldName]) return;

      const fileInput = form.querySelector(`[data-prop-file="${fieldName}"]`);
      if (fileInput && fileInput.files && fileInput.files.length > 0) return;

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "remove_" + fieldName;
      input.value = "1";
      form.appendChild(input);
    });
  });
});
