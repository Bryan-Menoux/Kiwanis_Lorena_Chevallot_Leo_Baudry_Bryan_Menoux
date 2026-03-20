export type CreationEntityType = "action" | "projet" | "produit";
export type CreationStatusType =
  | "actions"
  | "projets"
  | "produits"
  | "brouillon";

function buildSlugPath(id: string, slug: string): string {
  return `${id}-${slug}`;
}

export function getCreationViewUrl(
  entityType: CreationEntityType,
  id: string,
  slug: string,
): string {
  const slugPath = buildSlugPath(id, slug);

  if (entityType === "action") {
    return `/creation/actions/${slugPath}`;
  }

  if (entityType === "projet") {
    return `/creation/projets/`;
  }

  return getCreationEditUrl("produit", id, slug);
}

export function getCreationEditUrl(
  entityType: CreationEntityType,
  id: string,
  slug: string,
): string {
  const slugPath = buildSlugPath(id, slug);

  if (entityType === "action") {
    return `/creation/actions/edit/${slugPath}`;
  }

  if (entityType === "projet") {
    return `/creation/projets/edit/${slugPath}`;
  }

  return `/creation/produits/edit/${slugPath}`;
}

export function getDraftEditUrl(id: string, slug: string): string {
  return getCreationEditUrl("action", id, slug);
}

export function getDraftViewUrl(id: string, slug: string): string {
  return `/creation/brouillons/${buildSlugPath(id, slug)}`;
}

export function getCreationDashboardEditUrl(
  status: CreationStatusType,
  id: string,
  slug: string,
): string {
  if (status === "actions") {
    return getCreationEditUrl("action", id, slug);
  }

  if (status === "projets") {
    return getCreationEditUrl("projet", id, slug);
  }

  if (status === "produits") {
    return getCreationEditUrl("produit", id, slug);
  }

  return getDraftEditUrl(id, slug);
}

export function getCreationDashboardViewUrl(
  status: CreationStatusType,
  id: string,
  slug: string,
): string {
  if (status === "actions") {
    return getCreationViewUrl("action", id, slug);
  }

  if (status === "projets") {
    return getCreationViewUrl("projet", id, slug);
  }

  if (status === "produits") {
    return getCreationViewUrl("produit", id, slug);
  }

  return getDraftViewUrl(id, slug);
}
