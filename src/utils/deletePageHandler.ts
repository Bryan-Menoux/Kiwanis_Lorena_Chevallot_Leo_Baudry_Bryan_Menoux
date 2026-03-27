import { showAlert, showConfirm } from "./alerts";
import { getTotalPages, renderPagination, resolveNextPage } from "./renderPagination";
import { normalizeSearchTerm } from "./searchNormalization";

export interface DeletePageConfig {
  flashFlagsSelector: string;
  formSelector: string;
  gridSelector: string;
  searchInputSelector: string;
  sortSelectSelector?: string;
  selectAllSelector: string;
  bulkDeleteSelector: string;
  paginationSelector: string;
  cardSelector: string;
  dataIdAttribute: string;
  dataTitleAttribute: string;
  dataUpdatedAttribute: string;
  dataTypeAttribute?: string;
  itemSingular: string;
  itemPlural: string;
  pageSize: number;
  scrollTargetSelector: string;
  emptyStateMessage?: string;
}

const defaultConfig: DeletePageConfig = {
  flashFlagsSelector: "#delete-flash-flags",
  formSelector: "#deleteForm",
  gridSelector: "#cards-grid",
  searchInputSelector: "#search-input",
  sortSelectSelector: "#sort-select",
  selectAllSelector: "#selectAll",
  bulkDeleteSelector: "#bulkDelete",
  paginationSelector: "#cards-pagination",
  cardSelector: "label[data-item-id]",
  dataIdAttribute: "data-item-id",
  dataTitleAttribute: "data-title",
  dataUpdatedAttribute: "data-updated",
  itemSingular: "element",
  itemPlural: "elements",
  pageSize: 9,
  scrollTargetSelector: "#cards-grid",
  emptyStateMessage: "",
};

export function initDeletePageHandler(config: Partial<DeletePageConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };

  const flashFlags = document.querySelector<HTMLElement>(cfg.flashFlagsSelector);
  if (flashFlags) {
    const successMessage = flashFlags.dataset.success || "";
    const errorMessage = flashFlags.dataset.error || "";

    if (successMessage) {
      showAlert({
        type: "success",
        message: successMessage,
      });
    }

    if (errorMessage) {
      showAlert({
        type: "error",
        message: errorMessage,
      });
    }
  }

  const form = document.querySelector<HTMLFormElement>(cfg.formSelector);
  const grid = document.querySelector<HTMLElement>(cfg.gridSelector);
  const searchInput = document.querySelector<HTMLInputElement>(cfg.searchInputSelector);
  const sortSelect = cfg.sortSelectSelector
    ? document.querySelector<HTMLSelectElement>(cfg.sortSelectSelector)
    : null;
  const selectAllCheckbox = document.querySelector<HTMLInputElement>(cfg.selectAllSelector);
  const pagination = document.querySelector<HTMLElement>(cfg.paginationSelector);

  if (!(form instanceof HTMLFormElement) || !(grid instanceof HTMLElement)) {
    return;
  }

  const allCards = Array.from(
    grid.querySelectorAll<HTMLElement>(cfg.cardSelector),
  );
  const selectedIds = new Set<string>();
  const selectedTypes = new Map<string, string>();
  let bypassConfirmSubmit = false;
  let currentPage = 1;
  let currentSearch = "";
  let currentBeneficiary = "";
  let currentType = "";
  let sortDirection: "asc" | "desc" = "desc";

  const setSortDirectionFromValue = (value: string) => {
    sortDirection = value === "updated_asc" || value === "asc" ? "asc" : "desc";
  };

  if (sortSelect instanceof HTMLSelectElement) {
    setSortDirectionFromValue(sortSelect.value);
  }

  function getCardCheckbox(card: HTMLElement): HTMLInputElement | null {
    const checkbox = card.querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]');
    return checkbox instanceof HTMLInputElement ? checkbox : null;
  }

  function getFilteredCards(): HTMLElement[] {
    const query = currentSearch;

    return allCards.filter((card) => {
      const title = normalizeSearchTerm(card.getAttribute(cfg.dataTitleAttribute) || "");
      const beneficiary = normalizeSearchTerm(
        (card.getAttribute("data-beneficiary") ||
          card.querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]')?.dataset.beneficiary ||
          ""),
      );
      const types = String(
        card.getAttribute("data-types") ||
          card.querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]')?.dataset.types ||
          "",
      )
        .split("||")
        .map((value) => normalizeSearchTerm(value))
        .filter(Boolean);
      const typeFilter = normalizeSearchTerm(currentType);
      const beneficiaryFilter = normalizeSearchTerm(currentBeneficiary);

      if (query && !title.includes(query)) return false;
      if (beneficiaryFilter && !beneficiary.includes(beneficiaryFilter)) return false;
      if (typeFilter && !types.includes(typeFilter)) return false;
      return true;
    });
  }

  function getCardUpdatedTime(card: HTMLElement): number {
    const ts = card
      .querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]')
      ?.dataset.updatedTs;
    if (ts) {
      const parsedTs = Number(ts);
      if (Number.isFinite(parsedTs)) return parsedTs;
    }

    const checkboxUpdated = card
      .querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]')
      ?.dataset.updated;
    const rawUpdated = card.getAttribute(cfg.dataUpdatedAttribute) || checkboxUpdated || "";
    const timestamp = new Date(rawUpdated).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function updateDeleteButtonLabel() {
    const button = document.querySelector<HTMLButtonElement>(cfg.bulkDeleteSelector);
    if (!(button instanceof HTMLButtonElement)) return;

    const count = selectedIds.size;
    button.textContent =
      count > 0
        ? `Supprimer selection (${count})`
        : "Supprimer selection";
  }

  function updateSelectAllState() {
    if (!(selectAllCheckbox instanceof HTMLInputElement)) return;

    const filteredIds = getFilteredCards()
      .map((card) => getCardCheckbox(card)?.value)
      .filter((id): id is string => Boolean(id));

    const checkedCount = filteredIds.filter((id) => selectedIds.has(id)).length;

    if (filteredIds.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    if (checkedCount === filteredIds.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    if (checkedCount > 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
      return;
    }

    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }

  function syncCheckboxes() {
    if (!grid) return;
    grid.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="ids"]').forEach((checkbox) => {
      const id = checkbox.value;
      checkbox.checked = selectedIds.has(id);

      if (checkbox.dataset.selListenerAttached === "true") return;
      checkbox.dataset.selListenerAttached = "true";

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedIds.add(id);
          if (cfg.dataTypeAttribute) {
            selectedTypes.set(id, checkbox.dataset.type || "");
          }
        } else {
          selectedIds.delete(id);
          selectedTypes.delete(id);
        }

        updateSelectAllState();
        updateDeleteButtonLabel();
      });
    });

    updateSelectAllState();
    updateDeleteButtonLabel();
  }

  function scrollToGridTop() {
    const globalScrollUtils = (globalThis as { scrollUtils?: { scrollToTarget?: (target: string) => void } }).scrollUtils;
    if (globalScrollUtils && typeof globalScrollUtils.scrollToTarget === "function") {
      globalScrollUtils.scrollToTarget(cfg.scrollTargetSelector);
      return;
    }

    const target = document.querySelector<HTMLElement>(cfg.scrollTargetSelector);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateView() {
    if (allCards.length === 0) {
      grid!.innerHTML = cfg.emptyStateMessage
        ? `<div class="rounded-2xl border border-base-300 bg-base-100 p-6 text-base-content/70 shadow-sm">${cfg.emptyStateMessage}</div>`
        : "";
      if (pagination instanceof HTMLElement) {
        pagination.innerHTML = "";
      }
      if (selectAllCheckbox instanceof HTMLInputElement) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      updateDeleteButtonLabel();
      return;
    }

    const visibleCards = getFilteredCards().sort((cardA, cardB) => {
      const timeA = getCardUpdatedTime(cardA);
      const timeB = getCardUpdatedTime(cardB);
      const delta = timeB - timeA;
      return sortDirection === "asc" ? -delta : delta;
    });

    const totalPages = Math.max(1, Math.ceil(visibleCards.length / cfg.pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * cfg.pageSize;
    const pageItems = visibleCards.slice(startIndex, startIndex + cfg.pageSize);

    if (!grid) return;
    grid.innerHTML = "";
    pageItems.forEach((card) => grid.appendChild(card));

    if (pagination instanceof HTMLElement) {
      pagination.innerHTML = renderPagination(totalPages, currentPage);
    }

    syncCheckboxes();
  }

  form.addEventListener("submit", async (event) => {
    if (bypassConfirmSubmit) {
      bypassConfirmSubmit = false;
      return;
    }

    event.preventDefault();

    const selectedCount = selectedIds.size;
    if (selectedCount === 0) {
      showAlert({
        type: "warning",
        message: `Selectionnez au moins un ${cfg.itemSingular} avant de lancer la suppression.`,
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Confirmer la suppression",
      message: `Confirmez-vous la suppression de ${selectedCount} ${selectedCount > 1 ? cfg.itemPlural : cfg.itemSingular} ? Cette action est irreversible.`,
      type: "warning",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });

    if (!confirmed) return;

    form.querySelectorAll('input[name="ids"]').forEach((element) => element.remove());
    form.querySelectorAll('input[name="types"]').forEach((element) => element.remove());

    selectedIds.forEach((id) => {
      const hiddenId = document.createElement("input");
      hiddenId.type = "hidden";
      hiddenId.name = "ids";
      hiddenId.value = id;
      form.appendChild(hiddenId);

      if (!cfg.dataTypeAttribute) return;

      const hiddenType = document.createElement("input");
      hiddenType.type = "hidden";
      hiddenType.name = "types";
      hiddenType.value = selectedTypes.get(id) || "";
      form.appendChild(hiddenType);
    });

    bypassConfirmSubmit = true;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.submit();
    }
  });

  document.addEventListener("actions-filter-change", (event) => {
    const custom = event as CustomEvent<{
      search?: string;
      beneficiary?: string;
      type?: string;
    }>;
    currentSearch = normalizeSearchTerm(custom.detail?.search || "");
    currentBeneficiary = normalizeSearchTerm(custom.detail?.beneficiary || "");
    currentType = normalizeSearchTerm(custom.detail?.type || "");
    currentPage = 1;
    updateView();
  });

  if (sortSelect instanceof HTMLSelectElement) {
    sortSelect.addEventListener("change", () => {
      setSortDirectionFromValue(sortSelect.value);
      currentPage = 1;
      updateView();
    });
  }

  document.addEventListener("change", (event) => {
    if (!cfg.sortSelectSelector) return;

    const target =
      event.target instanceof HTMLElement
        ? event.target.closest(cfg.sortSelectSelector)
        : null;
    if (!(target instanceof HTMLSelectElement)) return;

    setSortDirectionFromValue(target.value);
    currentPage = 1;
    updateView();
  });

  if (selectAllCheckbox instanceof HTMLInputElement) {
    selectAllCheckbox.addEventListener("change", () => {
      const shouldSelect = selectAllCheckbox.checked;

      getFilteredCards().forEach((card) => {
        const checkbox = getCardCheckbox(card);
        if (!(checkbox instanceof HTMLInputElement)) return;

        if (shouldSelect) {
          selectedIds.add(checkbox.value);
          if (cfg.dataTypeAttribute) {
            selectedTypes.set(checkbox.value, checkbox.dataset.type || "");
          }
        } else {
          selectedIds.delete(checkbox.value);
          selectedTypes.delete(checkbox.value);
        }
      });

      grid.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="ids"]').forEach((checkbox) => {
        checkbox.checked = selectedIds.has(checkbox.value);
      });

      updateSelectAllState();
      updateDeleteButtonLabel();
    });
  }

  if (pagination instanceof HTMLElement) {
    pagination.addEventListener("click", (event) => {
      const target =
        event.target instanceof HTMLElement
          ? event.target.closest("[data-page-action]")
          : null;
      if (!(target instanceof HTMLElement)) return;

      const totalPages = getTotalPages(getFilteredCards().length, cfg.pageSize);
      const previousPage = currentPage;
      const action = target.getAttribute("data-page-action");
      currentPage = resolveNextPage(
        currentPage,
        totalPages,
        action,
        target.getAttribute("data-page"),
      );

      if (currentPage !== previousPage) {
        scrollToGridTop();
      }

      updateView();
    });
  }

  updateView();
}
