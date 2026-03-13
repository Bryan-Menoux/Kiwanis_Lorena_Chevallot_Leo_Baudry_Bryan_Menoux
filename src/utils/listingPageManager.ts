/**
 * Gestionnaire générique pour les pages de listing avec filtrage, tri et pagination
 * Utilisable pour actions, projets, et autres listes paginées
 */

export interface ListingState {
  allData: any[];
  currentPage: number;
  searchTerm: string;
  selectedBeneficiary: string;
  selectedYear: string;
  selectedType: string;
  selectedStatus: string;
  sortMode: "desc" | "asc";
}

export interface ListingConfig {
  pageSize?: number;
  containerId: string;
  sortSelectId?: string;
  emptyStateHtml?: string;
  dateFieldNames?: {
    start?: string;
    end?: string;
    updated?: string;
  };
  filterFields?: {
    title?: string;
    beneficiary?: string;
    type?: string;
    year?: string;
    status?: string;
  };
}

const DEFAULT_PAGE_SIZE = 9;
const DEFAULT_EMPTY_STATE = '<div class="text-center py-12"><p class="text-base-content/60 mb-4">Aucun élément trouvé</p></div>';

export class ListingPageManager {
  private state: ListingState;
  private config: Required<ListingConfig>;
  private container: HTMLElement | null;
  private sortSelect: HTMLSelectElement | null;

  constructor(
    initialData: any[],
    config: ListingConfig,
    initialSearchTerm: string = ""
  ) {
    this.state = {
      allData: initialData,
      currentPage: 1,
      searchTerm: initialSearchTerm,
      selectedBeneficiary: "",
      selectedYear: "",
      selectedType: "",
      selectedStatus: "",
      sortMode: "desc",
    };

    this.config = {
      pageSize: config.pageSize || DEFAULT_PAGE_SIZE,
      containerId: config.containerId,
      sortSelectId: config.sortSelectId || "sort-select",
      emptyStateHtml: config.emptyStateHtml || DEFAULT_EMPTY_STATE,
      dateFieldNames: config.dateFieldNames || {
        start: "startDate",
        end: "endDate",
        updated: "updated",
      },
      filterFields: config.filterFields || {
        title: "title",
        beneficiary: "beneficiary",
        type: "actionType",
        year: "year",
        status: "source",
      },
    };

    this.container = document.getElementById(this.config.containerId);
    this.sortSelect = document.getElementById(this.config.sortSelectId) as HTMLSelectElement;
  }

  /**
   * Formate une date au format FR
   */
  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  /**
   * Applique tous les filtres à la liste
   */
  applyFilters(): any[] {
    return this.state.allData.filter((item) => {
      if (this.state.selectedBeneficiary && this.config.filterFields) {
        const beneficiaryField = this.config.filterFields.beneficiary;
        if (beneficiaryField && !item[beneficiaryField as string]?.toString().toLowerCase().includes(this.state.selectedBeneficiary.toLowerCase())) {
          return false;
        }
      }

      if (this.state.searchTerm && this.config.filterFields) {
        const titleField = this.config.filterFields.title;
        if (titleField && !item[titleField as string]?.toString().toLowerCase().includes(this.state.searchTerm.toLowerCase())) {
          return false;
        }
      }

      if (this.state.selectedYear && this.config.dateFieldNames) {
        const startField = this.config.dateFieldNames.start;
        const endField = this.config.dateFieldNames.end;
        const dateStr = startField && item[startField as string] 
          ? item[startField as string] 
          : (endField && item[endField as string] ? item[endField as string] : null);
        if (dateStr) {
          const itemYear = new Date(dateStr as string).getFullYear().toString();
          if (itemYear !== this.state.selectedYear) return false;
        }
      }

      if (this.state.selectedType && this.config.filterFields) {
        const typeField = this.config.filterFields.type;
        if (typeField && Array.isArray(item[typeField as string])) {
          if (!item[typeField as string].includes(this.state.selectedType)) {
            return false;
          }
        }
      }

      if (this.state.selectedStatus && this.config.filterFields) {
        const statusField = this.config.filterFields.status;
        if (statusField) {
          const itemStatus = item[statusField as string];
          if (itemStatus !== this.state.selectedStatus) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Trie les items par date
   */
  sortList(list: any[]): any[] {
    return [...list].sort((a, b) => {
      const dateField = this.config.dateFieldNames?.updated || "updated";
      const dateA = new Date(a[dateField as string] || 0).getTime();
      const dateB = new Date(b[dateField as string] || 0).getTime();
      return this.state.sortMode === "desc" ? dateB - dateA : dateA - dateB;
    });
  }

  /**
   * Retourne un objet avec les dates formatées d'un item
   */
  getFormattedDates(item: any): {
    start: string;
    end: string;
    updated: string;
  } {
    const startField = this.config.dateFieldNames?.start || "startDate";
    const endField = this.config.dateFieldNames?.end || "endDate";
    const updatedField = this.config.dateFieldNames?.updated || "updated";

    return {
      start: this.formatDate(item[startField as string]),
      end: this.formatDate(item[endField as string]),
      updated: this.formatDate(item[updatedField as string]),
    };
  }

  /**
   * Met à jour l'état des filtres
   */
  updateFilters(filters: Partial<Pick<ListingState, "searchTerm" | "selectedBeneficiary" | "selectedYear" | "selectedType" | "selectedStatus">>) {
    this.state = { ...this.state, ...filters, currentPage: 1 };
  }

  /**
   * Change le mode de tri
   */
  setSortMode(mode: "desc" | "asc") {
    this.state.sortMode = mode;
    this.state.currentPage = 1;
  }

  /**
   * Navigue vers une page spécifique
   */
  goToPage(pageNumber: number, totalPages: number) {
    this.state.currentPage = Math.max(1, Math.min(pageNumber, totalPages));
  }

  /**
   * Obtient l'état actuel
   */
  getState(): ListingState {
    return { ...this.state };
  }

  /**
   * Initialise les event listeners pour la pagination
   */
  initPaginationListeners(renderCallback: () => void) {
    if (!this.container) return;

    this.container.addEventListener("click", (evt) => {
      const button = evt.target instanceof HTMLElement ? evt.target.closest("[data-page-action]") : null;
      if (!(button instanceof HTMLElement)) return;

      const action = button.getAttribute("data-page-action");
      const filtered = this.applyFilters();
      const sorted = this.sortList(filtered);
      const totalPages = Math.max(1, Math.ceil(sorted.length / this.config.pageSize));

      switch (action) {
        case "prev":
          this.goToPage(this.state.currentPage - 1, totalPages);
          break;
        case "next":
          this.goToPage(this.state.currentPage + 1, totalPages);
          break;
        case "go":
          const pageNum = Number(button.getAttribute("data-page"));
          if (!Number.isNaN(pageNum)) {
            this.goToPage(pageNum, totalPages);
          }
          break;
      }

      renderCallback();
    });
  }

  /**
   * Initialise les event listeners pour les filtres
   */
  initFilterListeners(renderCallback: () => void) {
    document.addEventListener("actions-filter-change", (evt) => {
      const detail = (evt as CustomEvent).detail || {};
      this.updateFilters({
        searchTerm: detail.search || "",
        selectedBeneficiary: detail.beneficiary || "",
        selectedYear: detail.year || "",
        selectedType: detail.type || "",
        selectedStatus: detail.status === "all" ? "" : (detail.status || ""),
      });
      renderCallback();
    });

    document.addEventListener("search-actions-change", (evt) => {
      const detail = (evt as CustomEvent).detail || {};
      this.updateFilters({
        searchTerm: detail.search || "",
        selectedBeneficiary: detail.beneficiary || "",
        selectedYear: detail.year || "",
        selectedType: detail.type || "",
        selectedStatus: detail.status === "all" ? "" : (detail.status || ""),
      });
      renderCallback();
    });
  }

  /**
   * Initialise les event listeners pour le tri
   */
  initSortListener(renderCallback: () => void) {
    if (!this.sortSelect) return;

    this.sortSelect.addEventListener("change", () => {
      const mode = this.sortSelect!.value === "récent" ? "desc" : "asc";
      this.setSortMode(mode);
      renderCallback();
    });
  }

  /**
   * Obtient les données paginées et statistiques
   */
  getPaginationData(): {
    items: any[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
    hasItems: boolean;
  } {
    const filtered = this.applyFilters();
    const sorted = this.sortList(filtered);
    const totalPages = Math.max(1, Math.ceil(sorted.length / this.config.pageSize));
    const validPage = Math.max(1, Math.min(this.state.currentPage, totalPages));
    this.state.currentPage = validPage;
    const startIndex = (validPage - 1) * this.config.pageSize;
    const items = sorted.slice(startIndex, startIndex + this.config.pageSize);

    return {
      items,
      totalPages,
      currentPage: validPage,
      totalItems: sorted.length,
      hasItems: sorted.length > 0,
    };
  }

  /**
   * Rend le conteneur vide
   */
  renderEmpty() {
    if (!this.container) return;
    this.container.innerHTML = this.config.emptyStateHtml;
  }
}
