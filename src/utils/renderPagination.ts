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

  const renderPageButton = (pageNumber: number, extraClass = "") => {
    const cls = pageNumber === currentPage ? activeButtonClass : buttonClass;
    return `<button type="button" class="${cls}${extraClass ? ` ${extraClass}` : ""}" data-page-action="go" data-page="${pageNumber}">${pageNumber}</button>`;
  };

  const mobileVisibleCount = 3;
  const desktopVisibleCount = 4;
  const leadingCount = Math.min(totalPages, desktopVisibleCount);
  const items: string[] = [];

  for (let pageNumber = 1; pageNumber <= leadingCount; pageNumber += 1) {
    const extraClass =
      pageNumber === 4 ? "hidden md:inline-flex" : "";
    items.push(renderPageButton(pageNumber, extraClass));
  }

  const hasHiddenMiddlePages = totalPages > desktopVisibleCount + 1;
  const hasLastPageOutsideLeading = totalPages > desktopVisibleCount;

  if (hasLastPageOutsideLeading) {
    const mobileNeedsEllipsis = totalPages > mobileVisibleCount + 1;
    const desktopNeedsEllipsis = hasHiddenMiddlePages;

    if (mobileNeedsEllipsis) {
      items.push(
        `<span class="btn btn-sm btn-ghost pointer-events-none md:hidden" aria-hidden="true">...</span>`,
      );
    }

    if (desktopNeedsEllipsis) {
      items.push(
        `<span class="btn btn-sm btn-ghost pointer-events-none hidden md:inline-flex" aria-hidden="true">...</span>`,
      );
    }

    items.push(renderPageButton(totalPages));
  }

  const pageButtons = items.join("");

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

export type PaginationAction = "prev" | "next" | "go";

export function getTotalPages(totalItems: number, pageSize: number): number {
  if (!Number.isFinite(totalItems) || totalItems <= 0) return 1;
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function resolveNextPage(
  currentPage: number,
  totalPages: number,
  action: string | null,
  targetPage?: string | number | null,
): number {
  const safeTotal = Math.max(1, Number.isFinite(totalPages) ? Math.floor(totalPages) : 1);
  const safeCurrent = Math.min(
    safeTotal,
    Math.max(1, Number.isFinite(currentPage) ? Math.floor(currentPage) : 1),
  );

  if (action === "prev") return Math.max(1, safeCurrent - 1);
  if (action === "next") return Math.min(safeTotal, safeCurrent + 1);
  if (action === "go") {
    const parsedTarget = Number(targetPage ?? "1");
    if (Number.isNaN(parsedTarget)) return safeCurrent;
    return Math.min(safeTotal, Math.max(1, Math.floor(parsedTarget)));
  }

  return safeCurrent;
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
  const PAGE_SIZE =
    Number.isFinite(config.pageSize) && Number(config.pageSize) > 0
      ? Number(config.pageSize)
      : 9;
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

  // Gestion de la pagination au clic
  container?.addEventListener("click", (event) => {
    const target =
      event.target instanceof HTMLElement
        ? event.target.closest("[data-page-action]")
        : null;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute("data-page-action");
    const totalPages = getTotalPages(state.filteredItems.length, PAGE_SIZE);
    const previousPage = state.currentPage;
    state.currentPage = resolveNextPage(
      state.currentPage,
      totalPages,
      action,
      target.getAttribute("data-page"),
    );

    if (state.currentPage !== previousPage) {
      applyAndRender();
    }
  });

  return state;
}
