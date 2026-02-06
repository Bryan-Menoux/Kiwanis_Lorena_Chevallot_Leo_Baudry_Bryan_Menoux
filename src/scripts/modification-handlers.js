// Handlers pour la section Modifications
// Ce fichier permet de ré-initialiser les event listeners après un rechargement dynamique

// Variables globales pour la pagination
let currentPage = 0;

// Fonctions utilitaires pour la pagination
function updateButtons() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const indicator = document.getElementById("page-indicator");
  const container = document.querySelector(".carousel-container");
  const totalPages = parseInt(container?.dataset.totalPages || "1");

  if (prevBtn) prevBtn.disabled = currentPage === 0;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  if (indicator)
    indicator.textContent = `Page ${currentPage + 1} sur ${totalPages}`;
}

// Navigation vers une page spécifique du carousel
function goToPage(page) {
  const container = document.querySelector(".carousel-container");
  const inner = document.getElementById("carousel-inner");
  const totalPages = parseInt(container?.dataset.totalPages || "1");

  currentPage = Math.max(0, Math.min(page, totalPages - 1));
  if (inner) {
    const slide = inner.children[0];
    const slideWidth = slide?.offsetWidth || 0;
    const computedStyle = getComputedStyle(inner);
    const gapValue = computedStyle.gap;
    const gap = parseFloat(gapValue) || 0;
    const offset = currentPage * (slideWidth + gap);
    inner.style.transform = `translateX(-${offset}px)`;
  }
  updateButtons();
}

// Fonction principale d'initialisation
// Cette fonction configure tous les event listeners pour la section modifications
// Elle est appelée au chargement initial et après chaque rechargement dynamique
export function initModifications() {
  // Réinitialisation des variables
  currentPage = 0;

  // Récupération des éléments DOM
  const container = document.querySelector(".carousel-container");
  const inner = document.getElementById("carousel-inner");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const indicator = document.getElementById("page-indicator");
  const totalPages = parseInt(container?.dataset.totalPages || "1");

  // Configuration de la pagination
  // Nettoyer les anciens listeners en clonant les éléments
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

  // Gestion des interactions de modification des utilisateurs
  let editingCard = null; // Carte utilisateur en cours de modification
  const modal = document.getElementById("modify-modal");

  // Gestionnaire d'événements pour les clics (boutons modifier/annuler)
  const clickHandler = (e) => {
    // Bouton modifier : ouvrir la modal avec les données de l'utilisateur
    const btn = e.target.closest(".modify-btn");
    if (btn) {
      e.preventDefault();
      const card = btn.closest(".user-card");
      if (card) {
        editingCard = card;
        const userId = card.dataset.userId;
        
        // Récupérer les données depuis le texte visible plutôt que les attributs
        const h3 = card.querySelector("h3");
        const p = card.querySelector("p");
        const userName = h3?.textContent?.trim() || '';
        const userEmail = p?.textContent?.trim() || '';
        const userAdmin = card.dataset.admin === 'true' || false;
        
        // Récupérer les éléments du formulaire à nouveau pour éviter les problèmes de clonage
        const modalUserId = document.getElementById("modal-user-id");
        const modalName = document.getElementById("modal-name");
        const modalEmail = document.getElementById("modal-email");
        const modalAdmin = document.getElementById("modal-admin");
        
        // Remplir les champs de la modal avec les données de l'utilisateur
        if (modalUserId) modalUserId.value = userId || '';
        if (modalName) modalName.value = userName || '';
        if (modalEmail) modalEmail.value = userEmail || '';
        if (modalAdmin) modalAdmin.checked = userAdmin;
        
        // Afficher/masquer le bouton de suppression selon si c'est l'utilisateur connecté
        const deleteBtn = document.getElementById("delete-btn");
        const currentUserId = modal?.dataset.currentUserId;
        if (deleteBtn) {
          deleteBtn.style.display = userId !== currentUserId ? 'flex' : 'none';
        }
        
        modal.classList.add("modal-open");
      }
    }

    // Bouton annuler : fermer la modal
    const cancelBtn = e.target.closest(".cancel-btn");
    if (cancelBtn) {
      modal.classList.remove("modal-open");
      editingCard = null;
    }
  };

  // Configuration du gestionnaire de clics global
  // Retirer l'ancien listener s'il existe pour éviter les doublons
  if (window._modificationClickHandler) {
    document.removeEventListener("click", window._modificationClickHandler);
  }
  window._modificationClickHandler = clickHandler;
  document.addEventListener("click", clickHandler);

  // Configuration du formulaire de modification
  const modalForm = document.getElementById("modify-form");
  if (modalForm) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = document.getElementById("modal-user-id").value;
      const name = document.getElementById("modal-name").value;
      const email = document.getElementById("modal-email").value;
      const admin = (document.getElementById("modal-admin")?.checked) || false;

      // Gestion de l'état de chargement du bouton
      const submitBtn = modalForm.querySelector('button[type="submit"]');
      const originalHTML = submitBtn?.innerHTML;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<span class="loading loading-spinner loading-sm"></span> Enregistrement...';
      }

      try {
        // Envoi de la requête de modification
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
          // Mise à jour optimiste de la carte utilisateur
          const h3 = editingCard.querySelector("h3");
          const p = editingCard.querySelector("p");
          if (h3) h3.textContent = data.name;
          if (p) p.textContent = data.email;
          editingCard.dataset.userId = userId;
          editingCard.dataset.userName = data.name;
          editingCard.dataset.userEmail = data.email;
          editingCard.dataset.admin = data.administrateur ? 'true' : 'false';

          // Fermeture de la modal
          document.getElementById("modify-modal").classList.remove("modal-open");
          editingCard = null;

          // Notification de succès
          const toast = document.createElement("div");
          toast.className =
            "alert alert-success fixed top-4 right-4 z-50 max-w-md shadow-lg";
          toast.setAttribute("role", "status");
          toast.setAttribute("aria-live", "polite");
          toast.innerHTML = `<span>${data.message || "Utilisateur modifié avec succès"}</span>`;
          document.body.appendChild(toast);

          setTimeout(() => {
            toast.remove();
          }, 5000);
        } else {
          alert("Erreur: " + (data.error || "Erreur inconnue"));
          if (submitBtn && originalHTML) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
          }
        }
      } catch (error) {
        alert("Erreur de réseau");
        if (submitBtn && originalHTML) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHTML;
        }
      }
    });
  }

  // Configuration de la recherche d'utilisateurs
  const userSearchInput = document.getElementById("user-search");
  if (userSearchInput) {
    userSearchInput.addEventListener("input", () => {
      const query = userSearchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".user-card");
      cards.forEach((card) => {
        const h3 = card.querySelector("h3");
        const p = card.querySelector("p");
        const name = (h3?.textContent || "").toLowerCase();
        const email = (p?.textContent || "").toLowerCase();
        if (name.includes(query) || email.includes(query)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  // Configuration du bouton de suppression
  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!editingCard) return;
      if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

      const userId = document.getElementById("modal-user-id").value;

      try {
        // Envoi de la requête de suppression
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
          // Suppression de la carte de l'interface
          editingCard.remove();
          document.getElementById("modify-modal").classList.remove("modal-open");
          editingCard = null;

          // Notification de succès
          const toast = document.createElement("div");
          toast.className =
            "alert alert-success fixed top-4 right-4 z-50 max-w-md shadow-lg";
          toast.setAttribute("role", "status");
          toast.setAttribute("aria-live", "polite");
          toast.innerHTML = `<span>${data.message || "Utilisateur supprimé avec succès"}</span>`;
          document.body.appendChild(toast);

          setTimeout(() => {
            toast.remove();
          }, 5000);
        } else {
          alert("Erreur: " + (data.error || "Erreur inconnue"));
        }
      } catch (error) {
        alert("Erreur de réseau");
      }
    });
  }

  // Initialisation de l'état des boutons
  updateButtons();
}
