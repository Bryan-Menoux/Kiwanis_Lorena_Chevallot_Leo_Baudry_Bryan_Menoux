import { showAlert, showConfirm } from "./alerts";
import { renderPagination } from "./renderPagination";

export interface DeletePageConfig {
  flashFlagsSelector: string;
  formSelector: string;
  gridSelector: string;
  searchInputSelector: string;
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
}

const defaultConfig: DeletePageConfig = {
  flashFlagsSelector: "#delete-flash-flags",
  formSelector: "#deleteForm",
  gridSelector: "#cards-grid",
  searchInputSelector: "#search-input",
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

  function getCardCheckbox(card: HTMLElement): HTMLInputElement | null {
    const checkbox = card.querySelector<HTMLInputElement>('input[type="checkbox"][name="ids"]');
    return checkbox instanceof HTMLInputElement ? checkbox : null;
  }

  function getFilteredCards(): HTMLElement[] {
    const query = (searchInput instanceof HTMLInputElement ? searchInput.value : "")
      .toLowerCase()
      .trim();

    return allCards.filter((card) => {
      const title = (card.getAttribute(cfg.dataTitleAttribute) || "").toLowerCase();
      return !query || title.includes(query);
    });
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
    const visibleCards = getFilteredCards().sort((cardA, cardB) => {
      const timeA = new Date(cardA.getAttribute(cfg.dataUpdatedAttribute) || "0").getTime();
      const timeB = new Date(cardB.getAttribute(cfg.dataUpdatedAttribute) || "0").getTime();
      return timeB - timeA;
    });

    const totalPages = Math.max(1, Math.ceil(visibleCards.length / cfg.pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * cfg.pageSize;
    const pageItems = visibleCards.slice(startIndex, startIndex + cfg.pageSize);

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

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      updateView();
    });
  }

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

      const totalPages = Math.max(1, Math.ceil(getFilteredCards().length / cfg.pageSize));
      const previousPage = currentPage;
      const action = target.getAttribute("data-page-action");

      if (action === "prev") {
        currentPage = Math.max(1, currentPage - 1);
      } else if (action === "next") {
        currentPage = Math.min(totalPages, currentPage + 1);
      } else if (action === "go") {
        const nextPage = Number(target.getAttribute("data-page") || "1");
        if (!Number.isNaN(nextPage)) {
          currentPage = Math.min(totalPages, Math.max(1, nextPage));
        }
      } else {
        return;
      }

      if (currentPage !== previousPage) {
        scrollToGridTop();
      }

      updateView();
    });
  }

  updateView();
}
