import { showAlert } from "../utils/alerts";
import { scrollToTarget } from "../utils/scroll.js";

// Initialisation des compteurs de vérification
// Les compteurs sont maintenant calculés à la volée depuis le DOM

// État de recherche persistant par liste
const searchState = {
  'pending-list': { query: '', filteredCards: null },
  'rejected-list': { query: '', filteredCards: null },
  'verified-list': { query: '', filteredCards: null }
};

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

// Mise à jour des badges - compte directement dans le DOM
function updateBadges() {
  // Compter les cartes originales (pas celles dans pagination-page)
  const pendingCount = getOriginalCards('pending-list', 'pending').length;
  const rejectedCount = getOriginalCards('rejected-list', 'rejected').length;
  const verifiedCount = getOriginalCards('verified-list', 'verified').length;

  // Mettre à jour les badges
  const badges = [
    { id: 'pending-badge', count: pendingCount },
    { id: 'rejected-badge', count: rejectedCount },
    { id: 'verified-badge', count: verifiedCount }
  ];

  badges.forEach(({ id, count }) => {
    const badge = document.getElementById(id);
    if (badge) {
      badge.textContent = count.toString();
      if (count > 0) {
        badge.style.display = 'inline-block';
        badge.style.visibility = 'visible';
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
      
      // Réinitialiser l'état de recherche
      listIds.forEach(id => {
        if (searchState[id]) {
          searchState[id].query = '';
          searchState[id].filteredCards = null;
        }
      });
      
      // Remplacer les listes
      listIds.forEach(id => {
        const newList = doc.querySelector(`#${id}`);
        if (newList) {
          const oldList = document.querySelector(`#${id}`);
          if (oldList) oldList.replaceWith(newList);
        }
      });

      // Réattachement des gestionnaires d'événements de formulaires seulement
      attachFormHandlers();
      
      // Faire exactement le même calcul qu'au chargement initial
      const searches = [
        ["pending-search", "pending-list"],
        ["rejected-search", "rejected-list"],
        ["verified-search", "verified-list"]
      ];
      searches.forEach(([inputId, listId]) => {
        // Nettoyer la pagination avant de recréer
        cleanupPagination(listId);
        // Réinitialiser le flag de recherche
        const searchInput = document.getElementById(inputId);
        if (searchInput) {
          searchInput.removeAttribute('data-search-attached');
        }
        // Recréer les composants
        setupSearch(inputId, listId);
        setupPagination(listId);
      });
      
      // Mise à jour des badges
      updateBadges();
    }
  } catch (error) {
    console.error("Erreur lors du rechargement:", error);
  }
}

// Traitement des actions utilisateur
// Gère l'animation et la suppression de la carte utilisateur lors d'une action
async function processUserAction(userCard, action, fromList = null) {
  // Animation de disparition de la carte
  userCard.classList.add(
    "opacity-0",
    "scale-95",
    "transition-all",
    "duration-300",
  );

  // Attendre la fin de l'animation puis recharger
  setTimeout(async () => {
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
      // Éviter l'ajout multiple d'écouteurs d'événements.
      if (!form.hasAttribute('data-form-handler-attached')) {
        form.setAttribute('data-form-handler-attached', 'true');
        form.addEventListener("submit", handleFormSubmit);
      }
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
        showAlert({
          type: "success",
          message: result.message || "Action effectuée avec succès",
        });
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
        showAlert({
          type: "success",
          message: result.message || "Action effectuée avec succès",
        });
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
  showAlert({
    type: "error",
    message: `Une erreur est survenue: ${errorMessage}`,
  });

  if (element && originalHTML) {
    setElementLoading(element, false, originalHTML);
  }
}

// Configuration de la pagination
// Met en place la pagination pour afficher 4 cartes par page
function setupPagination(listId) {
  const list = document.getElementById(listId);
  if (!list) return;

  // Nettoyer complètement avant de recréer
  cleanupPagination(listId);

  // Extraire le type de liste (en attente, rejetée, vérifiée) depuis l'ID
  const listType = listId.replace("-list", "");
  
  // Déterminer quelles cartes utiliser
  let allCards;
  const state = searchState[listId];
  
  if (state?.query && state?.filteredCards) {
    // Utiliser les cartes filtrées stockées dans l'état
    allCards = state.filteredCards;
  } else {
    // Récupérer toutes les cartes originales
    allCards = getOriginalCards(listId, listType);
  }
  
  if (allCards.length <= 4) {
    // Pas de pagination nécessaire, s'assurer que toutes les cartes sont visibles
    allCards.forEach(card => card.style.display = "");
    return;
  }

  // Masquer toutes les cartes originales
  const originalCards = getOriginalCards(listId, listType);
  originalCards.forEach(card => card.style.display = "none");

  // Calcul du nombre de pages
  const totalPages = Math.ceil(allCards.length / 4);
  let currentPage = 1;

  // Création du conteneur des pages
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-container mt-4";
  paginationContainer.id = `${listId}-pagination`;

  // Créer toutes les pages
  for (let page = 1; page <= totalPages; page++) {
    const pageDiv = document.createElement("div");
    pageDiv.className = "pagination-page space-y-4";
    pageDiv.id = `${listId}-page-${page}`;
    pageDiv.style.display = page === 1 ? "block" : "none";

    // Ajout des cartes pour cette page
    const startIndex = (page - 1) * 4;
    const endIndex = Math.min(startIndex + 4, allCards.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const clonedCard = allCards[i].cloneNode(true);
      clonedCard.style.display = "";
      pageDiv.appendChild(clonedCard);
    }

    list.appendChild(pageDiv);
  }

  // Création du conteneur des boutons
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "flex gap-2 justify-center mt-4";

  // Si 2 pages ou plus, utiliser flèches prev/next
  if (totalPages >= 2) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-sm";
    prevBtn.textContent = "Précédent";
    prevBtn.disabled = true;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        document.getElementById(`${listId}-page-${currentPage}`).style.display = "none";
        currentPage--;
        document.getElementById(`${listId}-page-${currentPage}`).style.display = "block";
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        pageIndicator.innerHTML = `<span class="hidden md:inline">Page </span>${currentPage}/${totalPages}`;
        // Après changement de page, replace le haut de la liste active dans le viewport.
        scrollToTarget(`#${listId}`);
      }
    });

    const pageIndicator = document.createElement("span");
    pageIndicator.className = "flex items-center px-3";
    pageIndicator.innerHTML = `<span class="hidden md:inline">Page </span>1/${totalPages}`;

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-sm";
    nextBtn.textContent = "Suivant";
    nextBtn.disabled = totalPages === 1;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        document.getElementById(`${listId}-page-${currentPage}`).style.display = "none";
        currentPage++;
        document.getElementById(`${listId}-page-${currentPage}`).style.display = "block";
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        pageIndicator.innerHTML = `<span class="hidden md:inline">Page </span>${currentPage}/${totalPages}`;
        // Même comportement pour la pagination suivante.
        scrollToTarget(`#${listId}`);
      }
    });

    buttonContainer.appendChild(prevBtn);
    buttonContainer.appendChild(pageIndicator);
    buttonContainer.appendChild(nextBtn);
  }

  paginationContainer.appendChild(buttonContainer);
  
  // Chercher et déplacer le bouton de rejet avant la pagination (pour la liste rejetée)
  const rejectBtn = list.querySelector("#reject-selected-btn");
  if (rejectBtn) {
    rejectBtn.parentNode?.removeChild(rejectBtn);
    list.appendChild(rejectBtn);
  }
  
  list.appendChild(paginationContainer);
}

// Nettoie complètement la pagination d'une liste
function cleanupPagination(listId) {
  const list = document.getElementById(listId);
  if (!list) return;
  
  // Supprimer toutes les pages de pagination
  const existingPages = list.querySelectorAll(".pagination-page");
  existingPages.forEach(page => page.remove());
  
  // Supprimer le conteneur de pagination
  const existingPagination = list.querySelector(`#${listId}-pagination`);
  if (existingPagination) existingPagination.remove();
  
  // Réafficher toutes les cartes originales
  const listType = listId.replace("-list", "");
  const originalCards = getOriginalCards(listId, listType);
  originalCards.forEach(card => {
    card.style.display = "";
  });
}

// Fonction utilitaire pour récupérer les cartes originales (hors pagination)
function getOriginalCards(listId, listType) {
  const list = document.getElementById(listId);
  if (!list) return [];
  
  const allCards = [];
  const candidateCards = list.querySelectorAll(`div[data-user-id][data-list-type="${listType}"]`);
  
  for (const card of candidateCards) {
    // Vérifier que la carte n'est pas dans une pagination-page
    let isInPaginationPage = false;
    let parent = card.parentElement;
    
    while (parent && parent !== list) {
      if (parent.classList.contains('pagination-page')) {
        isInPaginationPage = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    // Ajouter uniquement si pas dans une page de pagination
    if (!isInPaginationPage) {
      allCards.push(card);
    }
  }
  
  return allCards;
}

// Applique le filtre de recherche à une liste (sans interaction utilisateur)
function applySearchFilter(listId) {
  const state = searchState[listId];
  if (!state || !state.query) return; // Pas de recherche active
  
  const listType = listId.replace("-list", "");
  const allCards = getOriginalCards(listId, listType);
  
  // Filtrer selon la requête stockée
  const filteredCards = allCards.filter(card => {
    const text = card.textContent?.toLowerCase() || "";
    return text.includes(state.query.toLowerCase());
  });
  
  // Mettre à jour l'état
  state.filteredCards = filteredCards;
  
  // Appliquer la visibilité
  allCards.forEach(card => {
    const text = card.textContent?.toLowerCase() || "";
    if (text.includes(state.query.toLowerCase())) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// Configuration de la recherche
// Met en place la fonctionnalité de recherche pour filtrer les cartes utilisateur
function setupSearch(searchInputId, listId) {
  const searchInput = document.getElementById(searchInputId);
  if (!searchInput) return;

  // Évite l'attachement multiple
  if (searchInput.hasAttribute('data-search-attached')) return;
  searchInput.setAttribute('data-search-attached', 'true');

  // Restaurer la valeur de recherche depuis l'état si elle existe
  const state = searchState[listId];
  if (state && state.query) {
    searchInput.value = state.query;
  }

  // Gestionnaire d'événements pour la saisie dans le champ de recherche
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const list = document.getElementById(listId);
    if (!list) return;

    // Mettre à jour l'état de recherche pour cette liste
    searchState[listId].query = query;

    // Extraire le type de liste (en attente, rejetée, vérifiée) depuis l'ID
    const listType = listId.replace("-list", "");

    // Nettoyer complètement la pagination avant de recalculer
    cleanupPagination(listId);

    // Récupérer UNIQUEMENT les cartes originales (pas celles dans les pages de pagination)
    const allCards = getOriginalCards(listId, listType);
    
    if (query === "") {
      // Recherche vide : réinitialiser l'état
      searchState[listId].filteredCards = null;
      allCards.forEach(card => card.style.display = "");
      
      // Recréer la pagination avec toutes les cartes si nécessaire
      if (allCards.length > 4) {
        setupPagination(listId);
      }
    } else {
      // Filtrer les cartes selon la requête
      const filteredCards = allCards.filter(card => {
        const text = card.textContent?.toLowerCase() || "";
        return text.includes(query);
      });

      // Stocker les cartes filtrées dans l'état
      searchState[listId].filteredCards = filteredCards;

      // Appliquer la visibilité sur les cartes originales
      allCards.forEach(card => {
        const text = card.textContent?.toLowerCase() || "";
        card.style.display = text.includes(query) ? "block" : "none";
      });

      // Recréer la pagination avec les cartes filtrées si nécessaire
      if (filteredCards.length > 4) {
        setupPagination(listId);
      }
    }
  });
}

// Recréer la pagination avec des cartes filtrées
// Remarque : cette fonction est maintenant obsolète car setupPagination() gère tout
function recreatePagination(listId, cards) {
  // Cette fonction est conservée pour compatibilité mais n'est plus utilisée
  // setupPagination() gère maintenant toute la logique de pagination
  console.warn('recreatePagination() est obsolète, utilisez setupPagination() à la place');
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
  
  // Mise à jour initiale des badges depuis le DOM
  updateBadges();
}


