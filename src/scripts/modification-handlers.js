import { showAlert, showConfirm } from "../utils/alerts";
import { scrollToTarget } from "../utils/scroll.js";
import { normalizeSearchTerm } from "../utils/searchNormalization";

// Gestionnaires pour la section Modifications
// Ce fichier permet de réinitialiser les écouteurs d'événements après un rechargement dynamique.

let currentPage = 0;

function getHeaderOffset() {
  const header =
    document.getElementById("main-header") ||
    document.getElementById("creation-header") ||
    document.querySelector("header.fixed.top-0") ||
    document.querySelector("header");

  const headerOffset = header instanceof HTMLElement ? header.offsetHeight + 16 : 16;
  const minimumViewportOffset = Math.round(window.innerHeight * 0.15);
  return Math.max(headerOffset, minimumViewportOffset);
}

function getModificationScrollTarget() {
  const searchInput = document.getElementById("user-search");
  if (searchInput instanceof HTMLElement) {
    return (
      searchInput.closest(".px-8.py-8") ||
      searchInput.closest(".bg-white") ||
      searchInput
    );
  }

  return document.querySelector(".carousel-container");
}

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
    scrollToTarget(getModificationScrollTarget() || container, {
      offset: -getHeaderOffset(),
    });
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

    if (target === modal) {
      modal?.classList.remove("modal-open");
      editingCard = null;
      return;
    }

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
        const userAvatarUrl = card.dataset.avatarUrl || "";

        const modalUserId = document.getElementById("modal-user-id");
        const modalName = document.getElementById("modal-name");
        const modalEmail = document.getElementById("modal-email");
        const modalAdmin = document.getElementById("modal-admin");
        const modalAvatar = document.getElementById("modal-avatar");
        const modalAvatarPreview = document.getElementById("modal-avatar-preview");
        const modalAvatarPlaceholder = document.getElementById("modal-avatar-placeholder");

        if (modalUserId instanceof HTMLInputElement) modalUserId.value = userId;
        if (modalName instanceof HTMLInputElement) modalName.value = userName;
        if (modalEmail instanceof HTMLInputElement) modalEmail.value = userEmail;
        if (modalAdmin instanceof HTMLInputElement) modalAdmin.checked = userAdmin;
        if (modalAvatar instanceof HTMLInputElement) modalAvatar.value = "";
        if (modalAvatarPreview instanceof HTMLImageElement) {
          modalAvatarPreview.src = userAvatarUrl;
          modalAvatarPreview.classList.toggle("hidden", !userAvatarUrl);
        }
        if (modalAvatarPlaceholder instanceof HTMLElement) {
          modalAvatarPlaceholder.classList.toggle("hidden", Boolean(userAvatarUrl));
        }

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
    if (window._modificationSubmitHandler) {
      modalForm.removeEventListener("submit", window._modificationSubmitHandler);
    }

    const submitHandler = async (e) => {
      e.preventDefault();

      const userIdField = document.getElementById("modal-user-id");
      const nameField = document.getElementById("modal-name");
      const emailField = document.getElementById("modal-email");
      const adminField = document.getElementById("modal-admin");
      const avatarField = document.getElementById("modal-avatar");
      const userId = userIdField instanceof HTMLInputElement ? userIdField.value : "";
      const name = nameField instanceof HTMLInputElement ? nameField.value : "";
      const email = emailField instanceof HTMLInputElement ? emailField.value : "";
      const admin = adminField instanceof HTMLInputElement ? adminField.checked : false;
      const avatar =
        avatarField instanceof HTMLInputElement ? avatarField.files?.[0] || null : null;

      const submitBtn = modalForm.querySelector('button[type="submit"]');
      const originalHTML = submitBtn?.innerHTML;

      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<span class="loading loading-spinner loading-sm"></span> Enregistrement...';
      }

      try {
        const payload = new FormData();
        payload.set("formType", "modification");
        payload.set("userId", userId);
        payload.set("name", name);
        payload.set("email", email);
        payload.set("admin", admin ? "true" : "false");
        if (avatar instanceof File && avatar.size > 0) {
          payload.set("avatar", avatar);
        }

        const response = await fetch("/api/form-submit", {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          body: payload,
        });

        const data = await response.json();

        if (data.success && editingCard) {
          const h3 = editingCard.querySelector("h3");
          const p = editingCard.querySelector("p");
          const avatarWrapper = editingCard.querySelector(".avatar .rounded-full");
          const currentAvatarImage = avatarWrapper?.querySelector("img");

          if (h3) h3.textContent = data.name;
          if (p) p.textContent = data.email;

          editingCard.dataset.userId = userId;
          editingCard.dataset.userName = data.name;
          editingCard.dataset.userEmail = data.email;
          editingCard.dataset.admin = data.administrateur ? "true" : "false";
          editingCard.dataset.avatarUrl = data.avatarUrl || "";

          if (avatarWrapper instanceof HTMLElement) {
            if (data.avatarUrl) {
              if (currentAvatarImage instanceof HTMLImageElement) {
                currentAvatarImage.src = data.avatarUrl;
                currentAvatarImage.alt = `Photo de ${data.name || "l'utilisateur"}`;
              } else {
                avatarWrapper.innerHTML = "";
                const image = document.createElement("img");
                image.src = data.avatarUrl;
                image.alt = `Photo de ${data.name || "l'utilisateur"}`;
                image.className = "h-full w-full object-cover";
                avatarWrapper.appendChild(image);
              }
            } else {
              avatarWrapper.innerHTML =
                '<div class="flex h-full w-full items-center justify-center text-[10px] font-semibold text-base-content/60">Profil</div>';
            }
          }

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
    };

    window._modificationSubmitHandler = submitHandler;
    modalForm.addEventListener("submit", submitHandler);
  }

  const modalAvatarInput = document.getElementById("modal-avatar");
  const modalAvatarPreview = document.getElementById("modal-avatar-preview");
  const modalAvatarPlaceholder = document.getElementById("modal-avatar-placeholder");
  if (modalAvatarInput instanceof HTMLInputElement) {
    if (window._modificationAvatarHandler) {
      modalAvatarInput.removeEventListener("change", window._modificationAvatarHandler);
    }

    const avatarHandler = () => {
      const file = modalAvatarInput.files?.[0];
      if (!(file instanceof File)) return;
      const previewUrl = URL.createObjectURL(file);

      if (modalAvatarPreview instanceof HTMLImageElement) {
        modalAvatarPreview.src = previewUrl;
        modalAvatarPreview.classList.remove("hidden");
      }
      if (modalAvatarPlaceholder instanceof HTMLElement) {
        modalAvatarPlaceholder.classList.add("hidden");
      }
    };

    window._modificationAvatarHandler = avatarHandler;
    modalAvatarInput.addEventListener("change", avatarHandler);
  }

  const userSearchInput = document.getElementById("user-search");
  const userSearchApplyButton = document.getElementById("user-search-apply");
  if (userSearchInput instanceof HTMLInputElement) {
    if (
      userSearchApplyButton instanceof HTMLButtonElement &&
      window._modificationSearchHandler
    ) {
      userSearchApplyButton.removeEventListener("click", window._modificationSearchHandler);
    }

    const searchHandler = () => {
      const query = normalizeSearchTerm(userSearchInput.value);
      const cards = document.querySelectorAll(".user-card");
      let visibleCount = 0;
      let firstVisibleSlideIndex = -1;
      
      cards.forEach((card, index) => {
        const name = normalizeSearchTerm(card.querySelector("h3")?.textContent || "");
        const email = normalizeSearchTerm(card.querySelector("p")?.textContent || "");
        const isVisible = name.includes(query) || email.includes(query);
        card.style.display = isVisible ? "" : "none";
        if (isVisible) {
          visibleCount++;
          // Trouver la première slide qui contient une carte visible
          if (firstVisibleSlideIndex === -1) {
            const slide = card.closest(".carousel-slide");
            if (slide) {
              const parent = slide.parentElement;
              const slides = Array.from(parent?.children || []);
              firstVisibleSlideIndex = slides.indexOf(slide);
            }
          }
        }
      });
      
      // Si on a des résultats de recherche, aller à la première page avec un résultat
      if (query !== "" && firstVisibleSlideIndex >= 0) {
        goToPage(firstVisibleSlideIndex);
      } else if (query === "") {
        // Si la recherche est vidée, revenir à la première page
        goToPage(0);
      }
      
      // Gérer la pagination en fonction des résultats de recherche
      const paginationControls = document.querySelector(".flex.justify-center.items-center.gap-4.mt-8");
      if (paginationControls) {
        // Si la recherche est vide (pas de filtre), montrer la pagination normalement
        if (query === "") {
          paginationControls.style.display = "";
        } else {
          // Si la recherche a 6 résultats ou moins, masquer la pagination
          if (visibleCount <= 6) {
            paginationControls.style.display = "none";
          } else {
            paginationControls.style.display = "";
          }
        }
      }
    };

    window._modificationSearchHandler = searchHandler;
    if (userSearchApplyButton instanceof HTMLButtonElement) {
      userSearchApplyButton.addEventListener("click", searchHandler);
    }
  }

  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    if (window._modificationDeleteHandler) {
      deleteBtn.removeEventListener("click", window._modificationDeleteHandler);
    }

    const deleteHandler = async () => {
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
    };

    window._modificationDeleteHandler = deleteHandler;
    deleteBtn.addEventListener("click", deleteHandler);
  }

  if (totalPages > 0) {
    updateButtons();
  }
}
