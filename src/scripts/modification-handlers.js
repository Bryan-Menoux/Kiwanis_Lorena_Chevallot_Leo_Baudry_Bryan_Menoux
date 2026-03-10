import { showAlert, showConfirm } from "../utils/alerts";
import { scrollToTarget } from "../utils/scroll.js";

// Gestionnaires pour la section Modifications
// Ce fichier permet de réinitialiser les écouteurs d'événements après un rechargement dynamique.

let currentPage = 0;

function updateButtons() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const indicator = document.getElementById("page-indicator");
  const container = document.querySelector(".carousel-container");
  const totalPages = parseInt(container?.dataset.totalPages || "1", 10);

  if (prevBtn) prevBtn.disabled = currentPage === 0;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  if (indicator) indicator.textContent = `Page ${currentPage + 1} sur ${totalPages}`;
}

function goToPage(page) {
  const container = document.querySelector(".carousel-container");
  const inner = document.getElementById("carousel-inner");
  const totalPages = parseInt(container?.dataset.totalPages || "1", 10);
  const previousPage = currentPage;

  currentPage = Math.max(0, Math.min(page, totalPages - 1));

  if (inner) {
    const slide = inner.children[0];
    const slideWidth = slide?.offsetWidth || 0;
    const computedStyle = getComputedStyle(inner);
    const gap = parseFloat(computedStyle.gap) || 0;
    const offset = currentPage * (slideWidth + gap);
    inner.style.transform = `translateX(-${offset}px)`;
  }

  updateButtons();

  if (currentPage !== previousPage && container instanceof HTMLElement) {
    // En pagination carousel, remonte vers le haut de la liste des cartes.
    scrollToTarget(container);
  }
}

export function initModifications() {
  currentPage = 0;

  const container = document.querySelector(".carousel-container");
  const totalPages = parseInt(container?.dataset.totalPages || "1", 10);

  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (prevBtn) {
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.addEventListener("click", () => goToPage(currentPage - 1));
  }

  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener("click", () => goToPage(currentPage + 1));
  }

  let editingCard = null;
  const modal = document.getElementById("modify-modal");

  const clickHandler = (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest(".modify-btn");
    if (btn) {
      e.preventDefault();
      const card = btn.closest(".user-card");

      if (card) {
        editingCard = card;

        const userId = card.dataset.userId || "";
        const userName = card.querySelector("h3")?.textContent?.trim() || "";
        const userEmail = card.querySelector("p")?.textContent?.trim() || "";
        const userAdmin = card.dataset.admin === "true";

        const modalUserId = document.getElementById("modal-user-id");
        const modalName = document.getElementById("modal-name");
        const modalEmail = document.getElementById("modal-email");
        const modalAdmin = document.getElementById("modal-admin");

        if (modalUserId instanceof HTMLInputElement) modalUserId.value = userId;
        if (modalName instanceof HTMLInputElement) modalName.value = userName;
        if (modalEmail instanceof HTMLInputElement) modalEmail.value = userEmail;
        if (modalAdmin instanceof HTMLInputElement) modalAdmin.checked = userAdmin;

        const deleteBtn = document.getElementById("delete-btn");
        const currentUserId = modal?.dataset.currentUserId;
        if (deleteBtn) {
          deleteBtn.style.display = userId !== currentUserId ? "flex" : "none";
        }

        modal?.classList.add("modal-open");
      }
    }

    const cancelBtn = target.closest(".cancel-btn");
    if (cancelBtn) {
      modal?.classList.remove("modal-open");
      editingCard = null;
    }
  };

  if (window._modificationClickHandler) {
    document.removeEventListener("click", window._modificationClickHandler);
  }
  window._modificationClickHandler = clickHandler;
  document.addEventListener("click", clickHandler);

  const modalForm = document.getElementById("modify-form");
  if (modalForm instanceof HTMLFormElement) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userIdField = document.getElementById("modal-user-id");
      const nameField = document.getElementById("modal-name");
      const emailField = document.getElementById("modal-email");
      const adminField = document.getElementById("modal-admin");
      const userId = userIdField instanceof HTMLInputElement ? userIdField.value : "";
      const name = nameField instanceof HTMLInputElement ? nameField.value : "";
      const email = emailField instanceof HTMLInputElement ? emailField.value : "";
      const admin = adminField instanceof HTMLInputElement ? adminField.checked : false;

      const submitBtn = modalForm.querySelector('button[type="submit"]');
      const originalHTML = submitBtn?.innerHTML;

      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<span class="loading loading-spinner loading-sm"></span> Enregistrement...';
      }

      try {
        const response = await fetch("/api/form-submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            formType: "modification",
            userId,
            name,
            email,
            admin,
          }),
        });

        const data = await response.json();

        if (data.success && editingCard) {
          const h3 = editingCard.querySelector("h3");
          const p = editingCard.querySelector("p");

          if (h3) h3.textContent = data.name;
          if (p) p.textContent = data.email;

          editingCard.dataset.userId = userId;
          editingCard.dataset.userName = data.name;
          editingCard.dataset.userEmail = data.email;
          editingCard.dataset.admin = data.administrateur ? "true" : "false";

          document.getElementById("modify-modal")?.classList.remove("modal-open");
          editingCard = null;

          showAlert({
            type: "success",
            message:
              data.message ||
              "Les informations de l'utilisateur ont été mises à jour avec succès.",
          });
        } else {
          showAlert({
            type: "error",
            message:
              data.error ||
              "La modification de cet utilisateur n'a pas pu être enregistrée.",
          });

          if (submitBtn instanceof HTMLButtonElement && originalHTML) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
          }
        }
      } catch {
        showAlert({
          type: "error",
          message:
            "Impossible d'enregistrer la modification pour le moment. Vérifiez votre connexion puis réessayez.",
        });

        if (submitBtn instanceof HTMLButtonElement && originalHTML) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHTML;
        }
      }
    });
  }

  const userSearchInput = document.getElementById("user-search");
  if (userSearchInput instanceof HTMLInputElement) {
    userSearchInput.addEventListener("input", () => {
      const query = userSearchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".user-card");
      cards.forEach((card) => {
        const name = (card.querySelector("h3")?.textContent || "").toLowerCase();
        const email = (card.querySelector("p")?.textContent || "").toLowerCase();
        card.style.display = name.includes(query) || email.includes(query) ? "" : "none";
      });
    });
  }

  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!editingCard) return;
      const confirmed = await showConfirm({
        title: "Supprimer l'utilisateur",
        message:
          "Confirmez-vous la suppression définitive de cet utilisateur ? Cette action est irréversible.",
        type: "warning",
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
      });
      if (!confirmed) return;

      const userIdField = document.getElementById("modal-user-id");
      const userId = userIdField instanceof HTMLInputElement ? userIdField.value : "";

      try {
        const response = await fetch("/api/form-submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            formType: "deletion",
            userId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          editingCard.remove();
          document.getElementById("modify-modal")?.classList.remove("modal-open");
          editingCard = null;

          showAlert({
            type: "success",
            message: data.message || "L'utilisateur a été supprimé avec succès.",
          });
        } else {
          showAlert({
            type: "error",
            message:
              data.error ||
              "La suppression de cet utilisateur n'a pas pu être effectuée.",
          });
        }
      } catch {
        showAlert({
          type: "error",
          message:
            "Impossible de supprimer cet utilisateur pour le moment. Vérifiez votre connexion puis réessayez.",
        });
      }
    });
  }

  if (totalPages > 0) {
    updateButtons();
  }
}

