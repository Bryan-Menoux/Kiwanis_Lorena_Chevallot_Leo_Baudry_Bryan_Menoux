/**
 * Utilitaire pour les pages index de création/gestion
 * Consolide la logique côté serveur (frontmatter Astro)
 */

import slugify from "slugify";

export interface CreationIndexServerConfig {
  // Collections PocketBase
  mainCollection: string; // "actions", "projets", "produits"
  draftCollection?: string; // "brouillons" (optionnel si pas de brouillons)
  draftType?: string; // Type dans la collection brouillons (ex: "action", "projet")
  
  // Mappage de champs (pour différentes structures)
  fieldMapping?: {
    title?: string; // Default: "titre"
    updated?: string; // Default: "updated"
    dateField?: string; // Pour date spécifique (ex: "date_debut")
    beneficiary?: string; // Pour bénéficiaire/adresse
    typeField?: string; // Pour type d'action/projet
  };
  
  // Champs additionnels à inclure dans l'item
  additionalFields?: string[];
  
  // Options
  maxItems?: number; // Default: 200
}

export interface CreationIndexItem {
  id: string;
  title: string;
  slug: string;
  source: "item" | "brouillon";
  updated?: string;
  [key: string]: any;
}

/**
 * Récupère et transforme les items depuis PocketBase
 * Consolide la logique de toutes les pages index.astro
 */
export async function fetchAndTransformItems<T extends CreationIndexItem>(
  pb: any,
  config: CreationIndexServerConfig
): Promise<T[]> {
  const {
    mainCollection,
    draftCollection = "brouillons",
    draftType,
    fieldMapping = {},
    additionalFields = [],
    maxItems = 200,
  } = config;

  const titleField = fieldMapping.title || "titre";
  const updatedField = fieldMapping.updated || "updated";
  const dateField = fieldMapping.dateField || "date_debut";
  const beneficiaryField = fieldMapping.beneficiary || "beneficiaire";
  const typeField = fieldMapping.typeField || "type_action";

  // Récupère les items principaux
  let mainItems: any[] = [];
  try {
    mainItems = await pb.collection(mainCollection).getFullList(maxItems, {
      sort: `-${updatedField}`,
    });
  } catch (error) {
    console.error(`Error fetching ${mainCollection}:`, error);
  }

  // Récupère les brouillons si applicable
  let draftItems: any[] = [];
  if (draftCollection) {
    try {
      const filter = draftType ? `type = "${draftType}"` : undefined;
      draftItems = await pb.collection(draftCollection).getFullList(maxItems, {
        sort: `-${updatedField}`,
        filter,
      });
    } catch (error) {
      console.error(`Error fetching drafts:`, error);
    }
  }

  // Transforme les items principaux
  const transformedMain: T[] = mainItems.map((item) => ({
    id: item.id,
    title: item[titleField] || "Sans titre",
    slug: slugify(item[titleField] || "", { lower: true, strict: true }),
    source: "item" as const,
    updated: item[updatedField],
    ...(fieldMapping.dateField && { [dateField]: item[dateField] }),
    ...(fieldMapping.beneficiary && { [beneficiaryField]: item[beneficiaryField] }),
    ...(fieldMapping.typeField && { [typeField]: item[typeField] }),
    ...additionalFields.reduce(
      (acc, field) => {
        if (item[field] !== undefined) acc[field] = item[field];
        return acc;
      },
      {} as Record<string, any>
    ),
  })) as T[];

  // Transforme les brouillons
  const transformedDrafts: T[] = draftItems.map((item) => ({
    id: item.id,
    title: item[titleField] || "Brouillon sans titre",
    slug: slugify(item[titleField] || "brouillon", { lower: true, strict: true }),
    source: "brouillon" as const,
    updated: item[updatedField],
    ...(fieldMapping.dateField && { [dateField]: item[dateField] || item.date_debut }),
    ...(fieldMapping.beneficiary && {
      [beneficiaryField]: item[beneficiaryField] || item.nom_adresse || item.nom_lieu || item.adresse_lieu,
    }),
    ...(fieldMapping.typeField && { [typeField]: item[typeField] || [] }),
    ...additionalFields.reduce(
      (acc, field) => {
        if (item[field] !== undefined) acc[field] = item[field];
        return acc;
      },
      {} as Record<string, any>
    ),
  })) as T[];

  // Combine et trie
  const allItems = [...transformedMain, ...transformedDrafts].sort(
    (a, b) =>
      new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime()
  );

  return allItems;
}

/**
 * Récupère les années disponibles à partir des items
 */
export function getYearOptionsFromItems(
  items: CreationIndexItem[],
  dateField: string = "updated"
): string[] {
  const years = new Set<string>();
  
  items.forEach((item) => {
    const dateValue = item[dateField] || item.updated;
    if (dateValue) {
      try {
        years.add(new Date(dateValue).getFullYear().toString());
      } catch {
        // Ignore invalid dates
      }
    }
  });

  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Récupère le paramètre de recherche depuis l'URL
 */
export function getSearchParamFromUrl(url: URL): string {
  return (url.searchParams.get("q") || "").trim();
}
