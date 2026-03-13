import { getCreationEditUrl, getCreationViewUrl } from "./creationRoutes";

/**
 * Utilitaires pour le rendu des cartes d'élément
 * Utilisés dans les pages de listing
 */

export interface CardItem {
  id: string;
  title?: string;
  subtitle?: string;
  beneficiary?: string;
  updated?: string;
  source?: "action" | "brouillon" | "projet" | "produit";
  slug?: string;
  [key: string]: any;
}

export interface CardConfig {
  viewUrlPattern: (item: CardItem) => string;
  editUrlPattern: (item: CardItem) => string;
  isDraft?: (item: CardItem) => boolean;
  renderMeta?: (item: CardItem) => string;
  renderPublishButton?: (item: CardItem, editUrl: string) => string;
  formattedDateGetter?: (item: CardItem) => string;
}

/**
 * Rend une seule carte d'élément
 */
export function renderCard(item: CardItem, config: CardConfig): string {
  const viewUrl = config.viewUrlPattern(item);
  const editUrl = config.editUrlPattern(item);
  const isDraft = config.isDraft ? config.isDraft(item) : item.source === "brouillon";
  const formattedDate = config.formattedDateGetter ? config.formattedDateGetter(item) : item.updated || "";
  const metaHtml = config.renderMeta ? config.renderMeta(item) : "";
  const publishButton = config.renderPublishButton ? config.renderPublishButton(item, editUrl) : "";

  return `
    <div class="flex min-h-55 flex-col justify-between gap-4 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm md:p-5 lg:p-6" data-action-id="${item.id}" data-action-slug="${item.slug || ""}" data-source="${item.source || ""}">
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <h3 class="wrap-break-word text-xl font-bold leading-tight md:text-2xl">${item.title || "Sans titre"}</h3>
          ${isDraft ? '<span class="badge badge-secondary text-secondary-content shrink-0">Brouillon</span>' : ""}
        </div>
        ${item.subtitle ? `<p class="leading-relaxed wrap-break-word text-base-content/75">${item.subtitle}</p>` : ""}
        ${item.beneficiary ? `<p class="leading-relaxed wrap-break-word text-base-content/75">${item.beneficiary}</p>` : ""}
        ${metaHtml}
        <p class="text-xs leading-tight text-base-content/60">${formattedDate}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center md:justify-end">
        <a class="btn btn-sm btn-ghost action-btn-text w-full md:w-auto" href="${viewUrl}">Voir</a>
        <a class="btn btn-sm btn-accent action-btn-text w-full rounded-full md:w-auto" href="${editUrl}">Modifier</a>
        ${publishButton}
      </div>
    </div>
  `;
}

/**
 * Rend une liste de cartes
 */
export function renderCards(items: CardItem[], config: CardConfig): string {
  return items.map((item) => renderCard(item, config)).join("");
}

/**
 * Générateur de rendu pour cartes d'actions
 */
export function createActionCardRenderer(): CardConfig {
  return {
    viewUrlPattern: (item) =>
      item.source === "brouillon"
        ? `/creation/brouillons/${item.id}-${item.slug}`
        : getCreationViewUrl("action", item.id, item.slug || ""),
    editUrlPattern: (item) => getCreationEditUrl("action", item.id, item.slug || ""),
    isDraft: (item) => item.source === "brouillon",
    renderPublishButton: (item, editUrl) => {
      if (item.source !== "brouillon") return "";
      const missingFields = item.missingRequiredFields || [];
      return `<form method="POST" action="${editUrl}" data-publish-action-form="true" data-required-missing="${missingFields.join("||")}" class="col-span-2 w-full md:w-auto">
        <input type="hidden" name="publish_action" value="true" />
        <button type="submit" class="btn btn-sm btn-accent action-btn-text w-full rounded-full md:w-auto">Publier</button>
      </form>`;
    },
  };
}

/**
 * Générateur de rendu pour cartes de projets
 */
export function createProjectCardRenderer(): CardConfig {
  return {
    viewUrlPattern: (item) =>
      item.source === "brouillon"
        ? `/creation/brouillons/${item.id}-${item.slug}`
        : getCreationViewUrl("projet", item.id, item.slug || ""),
    editUrlPattern: (item) => getCreationEditUrl("projet", item.id, item.slug || ""),
    isDraft: (item) => item.source === "brouillon",
    renderMeta: (item) =>
      item.nom_adresse ? `<p class="leading-relaxed wrap-break-word text-base-content/75">${item.nom_adresse}</p>` : "",
  };
}

/**
 * Générateur de rendu pour cartes de produits
 */
export function createProductCardRenderer(): CardConfig {
  return {
    viewUrlPattern: (item) =>
      item.source === "brouillon"
        ? `/creation/brouillons/${item.id}-${item.slug}`
        : getCreationViewUrl("produit", item.id, item.slug || ""),
    editUrlPattern: (item) => getCreationEditUrl("produit", item.id, item.slug || ""),
    isDraft: (item) => item.source === "brouillon",
    renderMeta: (item) =>
      item.photoPreviewUrl
        ? `<div class="overflow-hidden rounded-lg border border-base-300 bg-base-200/40"><img src="${item.photoPreviewUrl}" alt="Aperçu produit" class="h-64 w-full object-contain" loading="lazy" decoding="async" /></div>`
        : "",
  };
}
