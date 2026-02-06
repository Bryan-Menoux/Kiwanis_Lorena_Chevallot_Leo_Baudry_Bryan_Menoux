// Initialisation des compteurs de vérification
let currentPendingCount;
let currentRejectedCount;
let currentVerifiedCount;

// Fonctions utilitaires
function getTargetList(action) {
  switch (action) {
    case "approve":
      return "verified-list";
    case "reject":
      return "rejected-list";
    case "unreject":
    case "unverify":
      return "pending-list";
    default:
      return null;
  }
}

// Gestion de l'état de chargement des éléments interactifs
function setElementLoading(element, loading, originalHTML = null) {
  if (loading) {
    element.disabled = true;
    element.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Traitement...';
  } else {
    element.disabled = false;
    if (originalHTML) element.innerHTML = originalHTML;
  }
}

// Mise à jour des badges et compteurs
// Cette fonction ajuste les compteurs en fonction des mouvements entre listes
// et met à jour l'affichage des badges correspondants
function updateBadges(fromList = null, toList = null) {
  // Ajustement des compteurs selon les listes source et destination
  if (fromList && toList) {
    if (fromList === 'pending-list') {
      currentPendingCount = Math.max(0, currentPendingCount - 1);
    } else if (fromList === 'rejected-list') {
      currentRejectedCount = Math.max(0, currentRejectedCount - 1);
    } else if (fromList === 'verified-list') {
      currentVerifiedCount = Math.max(0, currentVerifiedCount - 1);
    }

    if (toList === 'pending-list') {
      currentPendingCount++;
    } else if (toList === 'rejected-list') {
      currentRejectedCount++;
    } else if (toList === 'verified-list') {
      currentVerifiedCount++;
    }
  }

  // Configuration des badges avec leurs compteurs respectifs
  const badges = [
    { id: 'pending-badge', count: currentPendingCount },
    { id: 'rejected-badge', count: currentRejectedCount },
    { id: 'verified-badge', count: currentVerifiedCount }
  ];

  // Mise à jour de l'affichage de chaque badge
  badges.forEach(({ id, count }) => {
    const badge = document.getElementById(id);
    if (badge) {
      if (count > 0) {
        badge.textContent = count.toString();
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
  });
}

// Rechargement des listes utilisateur
// Recharge le contenu des listes depuis le serveur pour refléter les changements
async function reloadUserLists() {
  try {
    // Récupération du HTML mis à jour via une requête fetch
    const response = await fetch(window.location.pathname);
    if (response.ok) {
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Mise à jour de chaque liste avec le nouveau contenu
      const listIds = ["pending-list", "rejected-list", "verified-list"];
      listIds.forEach(id => {
        const newList = doc.querySelector(`#${id}`);
        if (newList) {
          const oldList = document.querySelector(`#${id}`);
          if (oldList) oldList.replaceWith(newList);
        }
      });

      // Réattachement des gestionnaires d'événements après mise à jour
      attachFormHandlers();
    }
  } catch (error) {
    console.error("Erreur lors du rechargement:", error);
  }
}

// Traitement des actions utilisateur
// Gère l'animation et la suppression de la carte utilisateur lors d'une action
async function processUserAction(userCard, action) {
  // Identification des listes source et destination
  const fromList = userCard.closest('#pending-list, #rejected-list, #verified-list')?.id;
  const toList = getTargetList(action);

  // Animation de disparition de la carte
  userCard.classList.add(
    "opacity-0",
    "scale-95",
    "transition-all",
    "duration-300",
  );

  // Suppression de la carte après l'animation et mise à jour des données
  setTimeout(async () => {
    userCard.remove();
    
    // Mise à jour des compteurs si les listes sont définies
    if (fromList && toList) {
      updateBadges(fromList, toList);
    }
    
    // Rechargement des listes pour synchroniser l'état
    await reloadUserLists();
  }, 300);
}

// Attachement des gestionnaires d'événements
function attachButtonHandlers() {
  const container = document.querySelector("#verifications");
  if (!container) return;

  // Évite l'attachement multiple des gestionnaires
  if (container.hasAttribute('data-button-handlers-attached')) return;
  container.setAttribute('data-button-handlers-attached', 'true');

  // Gestionnaire d'événements pour les clics sur les boutons d'action
  container.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      const button = target.closest(".verify-action");
      if (button) {
        handleButtonClick.call(button, e);
      }
    },
    true,
  );
}

function attachFormHandlers() {
  const container = document.querySelector("#verifications");
  if (!container) return;

  // Attachement des gestionnaires de soumission pour les formulaires de vérification
  container.querySelectorAll("form").forEach((form) => {
    const formSource = form.querySelector('input[name="formSource"]');
    if (formSource && formSource.value === "verification") {
      form.addEventListener("submit", handleFormSubmit);
    }
  });
}

// Gestionnaire de clic sur bouton
// Traite les actions de vérification déclenchées par les boutons
async function handleButtonClick(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
  const button = this;

  if (button.disabled) {
    return;
  }

  // Extraction des données nécessaires depuis les attributs du bouton
  const userId = button.dataset.userId;
  const action = button.dataset.action;

  if (!userId || !action) {
    console.error("Données requises manquantes sur le bouton");
    return;
  }

  const originalHTML = button.innerHTML;

  // Activation de l'état de chargement
  setElementLoading(button, true);

  try {
    // Envoi de la requête de traitement de l'action
    const response = await fetch("/api/form-submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        formType: "verification",
        userId,
        action,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        // Traitement réussi : animation et mise à jour de la carte utilisateur
        const userCard = button.closest("[data-user-id]");
        if (userCard) {
          await processUserAction(userCard, action);
        }
      } else {
        // Gestion des erreurs côté serveur
        handleError(result.error, button, originalHTML);
      }
    } else {
      // Gestion des erreurs HTTP
      handleError(`HTTP ${response.status}`, button, originalHTML);
    }
  } catch (error) {
    // Gestion des erreurs réseau
    handleError("Erreur réseau", button, originalHTML);
  }
}

// Gestionnaire de soumission de formulaire
// Traite les soumissions de formulaires de vérification
async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHTML = submitButton?.innerHTML;

  // Activation de l'état de chargement du bouton de soumission
  if (submitButton) {
    setElementLoading(submitButton, true);
  }

  const formData = new FormData(form);

  try {
    // Soumission des données du formulaire
    const response = await fetch(window.location.pathname, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        // Traitement réussi : récupération de la carte utilisateur et action
        const userCard = form.closest("[data-user-id]");

        if (userCard) {
          const actionInput = form.querySelector('input[name="action"]');
          const action = actionInput?.value;

          // Application de l'action sur la carte
          await processUserAction(userCard, action);
        }
      } else {
        // Gestion des erreurs
        handleError(result.error, submitButton, originalHTML);
      }
    } else {
        handleError(`HTTP ${response.status}`, submitButton, originalHTML);
    }
  } catch (error) {
    handleError("Erreur réseau", submitButton, originalHTML);
  }
}

// Gestion des erreurs
// Affiche un message d'erreur et restaure l'état de l'élément
function handleError(errorMessage, element, originalHTML) {
  alert(`Une erreur est survenue: ${errorMessage}`);

  if (element && originalHTML) {
    setElementLoading(element, false, originalHTML);
  }
}

// Configuration de la recherche
// Met en place la fonctionnalité de recherche pour filtrer les cartes utilisateur
function setupSearch(searchInputId, listId) {
  const searchInput = document.getElementById(searchInputId);
  if (!searchInput) return;

  // Évite l'attachement multiple
  if (searchInput.hasAttribute('data-search-attached')) return;
  searchInput.setAttribute('data-search-attached', 'true');

  // Gestionnaire d'événements pour la saisie dans le champ de recherche
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const list = document.getElementById(listId);
    if (!list) return;

    // Filtrage des cartes selon la requête de recherche
    const cards = list.querySelectorAll("div[data-user-id]");
    cards.forEach((card) => {
      const text = card.textContent?.toLowerCase() || "";
      if (text.includes(query)) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
  });
}

// Fonction d'initialisation principale
// Initialise tous les composants de vérification utilisateur
export function initVerifications() {
  const verifications = document.querySelector('#verifications');
  if (!verifications) return;

  // Initialisation des compteurs depuis les badges existants
  const pendingBadge = document.getElementById('pending-badge');
  const rejectedBadge = document.getElementById('rejected-badge');
  const verifiedBadge = document.getElementById('verified-badge');

  currentPendingCount = pendingBadge ? parseInt(pendingBadge.textContent || '0') : 0;
  currentRejectedCount = rejectedBadge ? parseInt(rejectedBadge.textContent || '0') : 0;
  currentVerifiedCount = verifiedBadge ? parseInt(verifiedBadge.textContent || '0') : 0;

  // Attachement des gestionnaires d'événements
  attachButtonHandlers();
  attachFormHandlers();
  
  // Configuration des recherches pour chaque liste
  const searches = [
    ["pending-search", "pending-list"],
    ["rejected-search", "rejected-list"],
    ["verified-search", "verified-list"]
  ];
  searches.forEach(([inputId, listId]) => setupSearch(inputId, listId));
  
  // Mise à jour initiale des badges
  updateBadges();
}