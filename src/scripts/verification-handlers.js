// Initialisation des compteurs de vérification
let currentPendingCount;
let currentRejectedCount;
let currentVerifiedCount;

// Fonctions utilitaires
function getTargetList(action, fromList = null) {
  switch (action) {
    case "approve":
      return "verified-list";
    case "reject":
      // Si on rejette depuis la liste vérifiée, retour en attente
      return fromList === "verified-list" ? "pending-list" : "rejected-list";
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
      
      // Réappliquer la pagination et les recherches après rechargement
      const searches = [
        ["pending-search", "pending-list"],
        ["rejected-search", "rejected-list"],
        ["verified-search", "verified-list"]
      ];
      listIds.forEach(id => {
        setupPagination(id);
        const searchConfig = searches.find(s => s[1] === id);
        if (searchConfig) setupSearch(searchConfig[0], searchConfig[1]);
      });
    }
  } catch (error) {
    console.error("Erreur lors du rechargement:", error);
  }
}

// Traitement des actions utilisateur
// Gère l'animation et la suppression de la carte utilisateur lors d'une action
async function processUserAction(userCard, action, fromList = null) {
  // Identification des listes source et destination
  const actualFromList = fromList || userCard.closest('#pending-list, #rejected-list, #verified-list')?.id;
  const toList = getTargetList(action, actualFromList);

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
    if (actualFromList && toList) {
      updateBadges(actualFromList, toList);
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

// Configuration de la pagination
// Met en place la pagination pour afficher 4 cartes par page
function setupPagination(listId) {
  const list = document.getElementById(listId);
  if (!list) return;

  const allCards = Array.from(list.querySelectorAll("div[data-user-id]"));
  if (allCards.length <= 4) return; // Pas de pagination si 4 ou moins

  // Masquer toutes les cartes originales
  allCards.forEach(card => card.style.display = "none");

  // Calcul du nombre de pages
  const totalPages = Math.ceil(allCards.length / 4);

  // Création du conteneur des pages
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-container mt-4";
  paginationContainer.id = `${listId}-pagination`;

  // Création de chaque page
  const pageButtons = [];
  for (let page = 1; page <= totalPages; page++) {
    const pageDiv = document.createElement("div");
    pageDiv.className = "pagination-page";
    pageDiv.id = `${listId}-page-${page}`;
    pageDiv.style.display = page === 1 ? "flex" : "none";
    pageDiv.style.flexDirection = "column";
    pageDiv.style.gap = "1rem";

    // Ajout des cartes pour cette page
    const startIndex = (page - 1) * 4;
    const endIndex = Math.min(startIndex + 4, allCards.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const clonedCard = allCards[i].cloneNode(true);
      clonedCard.style.display = "flex";
      clonedCard.style.justifyContent = "space-between";
      clonedCard.style.alignItems = "center";
      clonedCard.style.width = "100%";
      clonedCard.style.flexShrink = "0";
      
      // S'assurer que le div du texte prend tout l'espace
      const textDiv = clonedCard.querySelector('div:first-child');
      if (textDiv) {
        textDiv.style.flex = "1";
        textDiv.style.minWidth = "0";
      }
      
      pageDiv.appendChild(clonedCard);
    }

    list.appendChild(pageDiv);

    // Création du bouton pour cette page
    const button = document.createElement("button");
    button.className = `join-item btn btn-sm ${page === 1 ? "btn-active" : ""}`;
    button.textContent = page;
    button.dataset.page = page;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      // Masquer toutes les pages et désactiver tous les boutons
      for (let p = 1; p <= totalPages; p++) {
        document.getElementById(`${listId}-page-${p}`).style.display = "none";
      }
      pageButtons.forEach(btn => btn.classList.remove("btn-active"));
      
      // Afficher la page sélectionnée
      document.getElementById(`${listId}-page-${page}`).style.display = "flex";
      button.classList.add("btn-active");
    });
    pageButtons.push(button);
  }

  // Création du conteneur des boutons
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "join flex gap-2 justify-center mt-4";
  pageButtons.forEach(btn => buttonContainer.appendChild(btn));

  paginationContainer.appendChild(buttonContainer);
  list.appendChild(paginationContainer);
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

    // Récupérer toutes les cartes originales (non pagéifiées)
    const allCards = Array.from(list.querySelectorAll("div[data-user-id]")).filter(card => {
      return !card.closest(".pagination-page");
    });
    
    // Filtrer les cartes selon la requête
    const visibleCards = allCards.filter(card => {
      const text = card.textContent?.toLowerCase() || "";
      return text.includes(query);
    });

    // Cacher/afficher les cartes originales
    allCards.forEach(card => {
      const text = card.textContent?.toLowerCase() || "";
      if (text.includes(query)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });

    // Supprimer la pagination existante et les pages
    const paginationContainer = list.querySelector(`#${listId}-pagination`);
    if (paginationContainer) paginationContainer.remove();
    
    const pageContainers = list.querySelectorAll(".pagination-page");
    pageContainers.forEach(page => page.remove());

    // Recréer la pagination avec les cartes filtrées (ou toutes si search vide)
    if (visibleCards.length > 4) {
      recreatePagination(listId, visibleCards);
    } else if (query === "") {
      // Si le search est vide, réafficher la pagination normale
      setupPagination(listId);
    }
  });
}

// Recréer la pagination avec des cartes filtrées
function recreatePagination(listId, cards) {
  const list = document.getElementById(listId);
  if (!list) return;

  const totalPages = Math.ceil(cards.length / 4);

  // Création du conteneur des pages
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-container mt-4";
  paginationContainer.id = `${listId}-pagination`;

  // Création de chaque page
  const pageButtons = [];
  for (let page = 1; page <= totalPages; page++) {
    const pageDiv = document.createElement("div");
    pageDiv.className = "pagination-page";
    pageDiv.id = `${listId}-page-${page}`;
    pageDiv.style.display = page === 1 ? "flex" : "none";
    pageDiv.style.flexDirection = "column";
    pageDiv.style.gap = "1rem";

    // Ajout des cartes pour cette page
    const startIndex = (page - 1) * 4;
    const endIndex = Math.min(startIndex + 4, cards.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const clonedCard = cards[i].cloneNode(true);
      clonedCard.style.display = "flex";
      clonedCard.style.justifyContent = "space-between";
      clonedCard.style.alignItems = "center";
      clonedCard.style.width = "100%";
      clonedCard.style.flexShrink = "0";
      
      // S'assurer que le div du texte prend tout l'espace
      const textDiv = clonedCard.querySelector('div:first-child');
      if (textDiv) {
        textDiv.style.flex = "1";
        textDiv.style.minWidth = "0";
      }
      
      pageDiv.appendChild(clonedCard);
    }

    list.appendChild(pageDiv);

    // Création du bouton pour cette page
    const button = document.createElement("button");
    button.className = `join-item btn btn-sm ${page === 1 ? "btn-active" : ""}`;
    button.textContent = page;
    button.dataset.page = page;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      // Masquer toutes les pages et désactiver tous les boutons
      for (let p = 1; p <= totalPages; p++) {
        document.getElementById(`${listId}-page-${p}`).style.display = "none";
      }
      pageButtons.forEach(btn => btn.classList.remove("btn-active"));
      
      // Afficher la page sélectionnée
      document.getElementById(`${listId}-page-${page}`).style.display = "flex";
      button.classList.add("btn-active");
    });
    pageButtons.push(button);
  }

  // Création du conteneur des boutons
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "join flex gap-2 justify-center mt-4";
  pageButtons.forEach(btn => buttonContainer.appendChild(btn));

  paginationContainer.appendChild(buttonContainer);
  list.appendChild(paginationContainer);
}

// Mise à jour de l'affichage de la pagination
function updatePaginationDisplay(listId, visibleCards = null) {
  const list = document.getElementById(listId);
  if (!list) return;

  const pagination = list.querySelector(`#${listId}-pagination`);
  if (!pagination) return;

  // Récupérer les cartes visibles ou toutes les cartes
  const allCards = visibleCards || Array.from(list.querySelectorAll("div[data-user-id]:not(.hidden)"));
  
  if (allCards.length <= 4) {
    pagination.style.display = "none";
  } else {
    pagination.style.display = "block";
  }
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
  
  // Configuration des recherches et de la pagination pour chaque liste
  const searches = [
    ["pending-search", "pending-list"],
    ["rejected-search", "rejected-list"],
    ["verified-search", "verified-list"]
  ];
  searches.forEach(([inputId, listId]) => {
    setupSearch(inputId, listId);
    setupPagination(listId);
  });
  
  // Mise à jour initiale des badges
  updateBadges();
}