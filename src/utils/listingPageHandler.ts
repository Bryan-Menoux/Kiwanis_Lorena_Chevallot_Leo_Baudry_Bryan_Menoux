// Gestionnaire réutilisable pour les pages de listing/pagination
// Consolide la logique de filtrage, pagination et rendu commune

export interface ListingItem {
  id: string;
  [key: string]: any;
}

export interface ListingPageConfig<T extends ListingItem> {
  items: T[];
  containerSelector: string;
  pageSize?: number;
  onRender?: (container: HTMLElement, html: string) => void;
}

export interface ListingState {
  currentPage: number;
  currentSearch: string;
  currentFilters: Record<string, string>;
  filteredItems: any[];
}

/**
 * Initialize listing page with filtering and pagination
 */
export function initListingPage<T extends ListingItem>(
  config: ListingPageConfig<T>
): ListingState {
  const PAGE_SIZE = config.pageSize || 9;
  const container = document.getElementById(config.containerSelector.replace("#", ""));

  const state: ListingState = {
    currentPage: 1,
    currentSearch: container?.dataset.initialSearch || "",
    currentFilters: {},
    filteredItems: config.items.slice(),
  };

  return state;
}

/**
 * Apply pagination to a filtered list
 */
export function paginate<T extends ListingItem>(
  items: T[],
  page: number,
  pageSize: number = 9
): { items: T[]; totalPages: number; validPage: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return { items: pageItems, totalPages, validPage };
}

/**
 * Generic filter function that applies multiple filters
 */
export function applyFilters<T extends ListingItem>(
  items: T[],
  filters: {
    search?: { fields: string[]; value: string };
    year?: { field: string; value: string };
    type?: { field: string; value: string };
    custom?: (item: T) => boolean;
  }
): T[] {
  let filtered = items.slice();

  // Filtre de recherche
  if (filters.search?.value && filters.search.value !== "") {
    const searchLower = filters.search.value.toLowerCase();
    filtered = filtered.filter((item) =>
      filters.search!.fields.some((field) =>
        (item[field] || "").toString().toLowerCase().includes(searchLower)
      )
    );
  }

  // Filtre par année
  if (filters.year?.value && filters.year.value !== "") {
    filtered = filtered.filter((item) => {
      const dateField = item[filters.year!.field];
      if (!dateField) return false;
      return new Date(dateField).getFullYear().toString() === filters.year!.value;
    });
  }

  // Filtre par type
  if (filters.type?.value && filters.type.value !== "") {
    filtered = filtered.filter((item) => {
      const typeField = item[filters.type!.field];
      if (Array.isArray(typeField)) {
        return typeField.includes(filters.type!.value);
      }
      return typeField === filters.type!.value;
    });
  }

  // Filtre personnalisé
  if (filters.custom) {
    filtered = filtered.filter(filters.custom);
  }

  return filtered;
}

/**
 * Sort items by a field
 */
export function sortItems<T extends ListingItem>(
  items: T[],
  sortKey: string,
  field: string = "updated",
  direction: "asc" | "desc" = "desc"
): T[] {
  const sorted = items.slice();
  sorted.sort((a, b) => {
    const aVal = new Date(a[field] || 0).getTime();
    const bVal = new Date(b[field] || 0).getTime();
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

/**
 * Scroll to page container
 */
export function scrollToContainer(selector: string): void {
  const container = document.querySelector(selector);
  if (container instanceof HTMLElement) {
    container.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  // Fallback
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateString: string): string {
  if (!dateString) return "";

  // Essaie d'utiliser l'utilitaire global si disponible
  if (
    typeof window !== "undefined" &&
    (window as any).dateUtils?.formatDateShort
  ) {
    try {
      return (window as any).dateUtils.formatDateShort(dateString);
    } catch (e) {}
  }

  // Retour au formatage natif
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Build HTML for empty state
 */
export function buildEmptyStateHtml(message: string): string {
  return `<div class="text-center py-12"><p class="text-base-content/60 mb-4">${message}</p></div>`;
}

/**
 * Create a reusable filter handler
 */
export function createFilterHandler<T extends ListingItem>(
  allItems: T[],
  containerSelector: string,
  renderFunction: (items: T[], currentPage: number) => string,
  pageSize: number = 9
) {
  const state: ListingState = {
    currentPage: 1,
    currentSearch: "",
    currentFilters: {},
    filteredItems: allItems.slice(),
  };

  function applyAndRender() {
    const container = document.getElementById(containerSelector.replace("#", ""));
    if (!container) return;

    const html = renderFunction(state.filteredItems, state.currentPage);
    container.innerHTML = html;
  }

  function updateFilters(filters: Record<string, string>) {
    state.currentFilters = filters;
    state.currentPage = 1;
    applyAndRender();
  }

  function goToPage(page: number) {
    state.currentPage = page;
    applyAndRender();
  }

  return {
    state,
    applyAndRender,
    updateFilters,
    goToPage,
  };
}
