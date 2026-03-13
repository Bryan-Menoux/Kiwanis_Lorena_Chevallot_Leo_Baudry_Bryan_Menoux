// Génère le HTML des contrôles de pagination côté client
// Retourne une chaîne vide si une seule page (ou moins) est disponible
// Toutes les options sont facultatives et ont des valeurs par défaut
export function renderPagination(
  totalPages: number,
  currentPage: number,
  options: {
    // Libellés des boutons précédent et suivant
    prevLabel?: string;
    nextLabel?: string;
    // Classe CSS de l'élément conteneur
    wrapperClass?: string;
    // Affiche ou non les boutons Précédent/Suivant (true par défaut)
    showPrevNext?: boolean;
    // Classe de base des boutons de page
    buttonClass?: string;
    // Classe du bouton de la page active
    activeButtonClass?: string;
    // Si true, retourne uniquement les boutons sans le div conteneur
    noWrapper?: boolean;
  } = {},
): string {
  if (totalPages <= 1) return "";

  const {
    prevLabel = "Précédent",
    nextLabel = "Suivant",
    wrapperClass = "mt-6 flex flex-wrap items-center justify-center gap-2",
    showPrevNext = true,
    buttonClass = "btn btn-sm btn-ghost rounded-full",
    activeButtonClass = "btn btn-sm btn-accent rounded-full",
    noWrapper = false,
  } = options;

  const pageButtons = Array.from({ length: totalPages }, (_, i) => {
    const n = i + 1;
    const cls = n === currentPage ? activeButtonClass : buttonClass;
    return `<button type="button" class="${cls}" data-page-action="go" data-page="${n}">${n}</button>`;
  }).join("");

  if (noWrapper) return pageButtons;

  const prevDisabled = currentPage === 1 ? " disabled" : "";
  const nextDisabled = currentPage === totalPages ? " disabled" : "";
  const nav = showPrevNext
    ? `<button type="button" class="${buttonClass}" data-page-action="prev"${prevDisabled}>${prevLabel}</button>
  ${pageButtons}
  <button type="button" class="${buttonClass}" data-page-action="next"${nextDisabled}>${nextLabel}</button>`
    : pageButtons;

  return `<div class="${wrapperClass}">${nav}</div>`;
}

// Initialise une page de listing avec filtrage, pagination et rendu
export interface ListingPageOptions<T extends Record<string, any>> {
  items: T[];
  containerSelector: string;
  pageSize?: number;
  renderFunction: (items: T[], currentPage: number) => string;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export interface ListingPageState {
  currentPage: number;
  currentSearch: string;
  currentFilters: Record<string, string>;
  filteredItems: any[];
}

export function initListingPage<T extends Record<string, any>>(
  config: ListingPageOptions<T>
): ListingPageState {
  const PAGE_SIZE = config.pageSize || 9;
  const container = document.getElementById(config.containerSelector.replace("#", ""));

  const state: ListingPageState = {
    currentPage: 1,
    currentSearch: container?.dataset.initialSearch || "",
    currentFilters: {},
    filteredItems: config.items.slice(),
  };

  function applyAndRender() {
    const html = config.renderFunction(state.filteredItems, state.currentPage);
    if (container) {
      container.innerHTML = html;
    }
  }

  function updateFilters(filters: Record<string, string>) {
    state.currentFilters = filters;
    state.currentPage = 1;
    if (config.onFilterChange) {
      config.onFilterChange(filters);
    }
    applyAndRender();
  }

  function goToPage(page: number) {
    state.currentPage = page;
    applyAndRender();
  }

  // Gestion de la pagination au clic
  container?.addEventListener("click", (event) => {
    const target =
      event.target instanceof HTMLElement
        ? event.target.closest("[data-page-action]")
        : null;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute("data-page-action");
    const totalPages = Math.max(1, Math.ceil(state.filteredItems.length / PAGE_SIZE));
    const previousPage = state.currentPage;

    if (action === "prev") {
      state.currentPage = Math.max(1, state.currentPage - 1);
    } else if (action === "next") {
      state.currentPage = Math.min(totalPages, state.currentPage + 1);
    } else if (action === "go") {
      const nextPage = Number(target.getAttribute("data-page") || "1");
      if (!Number.isNaN(nextPage)) {
        state.currentPage = Math.min(totalPages, Math.max(1, nextPage));
      }
    } else {
      return;
    }

    if (state.currentPage !== previousPage) {
      applyAndRender();
    }
  });

  return state;
}
