/**
 * Utilitaire centralisé pour les pages de gestion (création, édition, suppression)
 * Consolide les patterns répétés dans creation/actions, creation/projets, etc.
 */

import {
  getCreationEditUrl,
  getCreationViewUrl,
} from "./creationRoutes";

export interface CreationItem {
  id: string;
  title: string;
  slug: string;
  source: "item" | "brouillon";
  updated?: string;
  [key: string]: any;
}

export interface CreationPageConfig<T extends CreationItem = CreationItem> {
  // Données
  items: T[];
  
  // Configuration UI
  pageTitle: string; // "Actions", "Projets", "Produits"
  createButtonText: string; // "Créer une action"
  createButtonUrl: string; // "/creation/actions/nouveau"
  viewSiteUrl: string; // "/actions"
  
  // Internationalisation
  itemSingular: string; // "action", "projet"
  itemPlural: string; // "actions", "projets"
  nothingFoundText?: string; // Texte personnalisé si rien trouvé
  
  // Filtres optionnels
  searchFields?: string[]; // Champs à chercher (default: title)
  filterFields?: {
    beneficiary?: string; // Champ pour bénéficiaire/adresse
    year?: string; // Champ pour année
    type?: string; // Champ pour type
  };
  
  // Rendu
  renderCard?: (item: T) => string; // Fonction personnalisée pour carte
  pageSize?: number; // Default: 9
}

/**
 * Extrait les années disponibles à partir des items
 */
export function getYearOptions(
  items: CreationItem[],
  dateField: string = "updated"
): string[] {
  const years = new Set<string>();
  items.forEach((item) => {
    const dateValue = item[dateField] || (item as any).updated;
    if (dateValue) {
      years.add(new Date(dateValue).getFullYear().toString());
    }
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Crée un objet d'état pour les pages de listing avec valeurs initiales
 */
export function createListingState(initialSearch: string = "") {
  return {
    currentPage: 1,
    searchTerm: initialSearch,
    selectedBeneficiary: "",
    selectedYear: "",
    selectedType: "",
    sortMode: "desc" as const,
  };
}

/**
 * Formate une date avec gestion d'erreurs
 */
export function formatItemDate(dateStr: string | undefined): string {
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
 * Construit les URLs pour un item (vue et édition)
 */
export function getItemUrls(
  item: CreationItem,
  basePath: string
): { view: string; edit: string } {
  if (item.source === "brouillon") {
    const slugPath = `${item.id}-${item.slug}`;
    return {
      view: `/creation/brouillons/${slugPath}`,
      edit: `/creation/brouillons/${slugPath}`,
    };
  }

  const entityType =
    basePath === "actions"
      ? "action"
      : basePath === "projets"
        ? "projet"
        : "produit";

  return {
    view: getCreationViewUrl(entityType, item.id, item.slug),
    edit: getCreationEditUrl(entityType, item.id, item.slug),
  };
}

/**
 * Applique les filtres à une liste d'items
 */
export function applyListingFilters<T extends CreationItem>(
  items: T[],
  filters: {
    search?: string;
    beneficiary?: string;
    year?: string;
    type?: string;
  },
  config: {
    searchFields?: string[];
    filterFields?: Record<string, string>;
  } = {}
): T[] {
  const {
    search = "",
    beneficiary = "",
    year = "",
    type = "",
  } = filters;

  const searchFields = config.searchFields || ["title"];
  const filterFields = config.filterFields || {};

  return items.filter((item) => {
    // Filtre recherche
    if (search) {
      const searchLower = search.toLowerCase();
      const matches = searchFields.some((field) =>
        (item[field] || "").toString().toLowerCase().includes(searchLower)
      );
      if (!matches) return false;
    }

    // Filtre bénéficiaire/adresse
    if (beneficiary && filterFields.beneficiary) {
      const beneficiaryValue = (item[filterFields.beneficiary] || "").toString().toLowerCase();
      if (!beneficiaryValue.includes(beneficiary.toLowerCase())) {
        return false;
      }
    }

    // Filtre année
    if (year && filterFields.year) {
      const dateValue = item[filterFields.year] || (item as any).updated;
      if (!dateValue || new Date(dateValue).getFullYear().toString() !== year) {
        return false;
      }
    }

    // Filtre type
    if (type && filterFields.type) {
      const typeValue = item[filterFields.type];
      if (Array.isArray(typeValue)) {
        if (!typeValue.includes(type)) return false;
      } else {
        if (typeValue !== type) return false;
      }
    }

    return true;
  });
}

/**
 * Trie les items par date mise à jour
 */
export function sortItems<T extends CreationItem>(
  items: T[],
  mode: "asc" | "desc" = "desc"
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.updated || 0).getTime();
    const dateB = new Date(b.updated || 0).getTime();
    return mode === "desc" ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Pagine une liste d'items
 */
export function paginateItems<T extends CreationItem>(
  items: T[],
  page: number,
  pageSize: number = 9
): {
  items: T[];
  totalPages: number;
  validPage: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    totalPages,
    validPage,
  };
}

/**
 * Génère le HTML d'une carte d'item standard
 */
export function renderDefaultCard(item: CreationItem, basePath: string): string {
  const { view, edit } = getItemUrls(item, basePath);
  const isDraft = item.source === "brouillon";
  const formattedDate = formatItemDate(item.updated);

  return `
    <div class="flex min-h-55 flex-col justify-between gap-4 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm md:p-5 lg:p-6" data-item-id="${item.id}" data-item-slug="${item.slug}" data-source="${item.source}">
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <h3 class="wrap-break-word text-xl font-bold leading-tight md:text-2xl">${item.title}</h3>
          ${isDraft ? '<span class="badge badge-secondary text-secondary-content shrink-0">Brouillon</span>' : ""}
        </div>
        <p class="text-xs leading-tight text-base-content/60">${formattedDate}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center md:justify-end">
        <a class="btn btn-sm btn-ghost action-btn-text w-full md:w-auto" href="${view}">Voir</a>
        <a class="btn btn-sm btn-accent action-btn-text w-full rounded-full md:w-auto" href="${edit}">Modifier</a>
      </div>
    </div>
  `;
}
