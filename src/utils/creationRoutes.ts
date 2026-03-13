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
    return `/creation/projets/edit/${slugPath}`;
  }

  return `/creation/produits/${slugPath}`;
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

export function getDraftEditUrl(
  draftType: string | undefined,
  id: string,
  slug: string,
): string {
  if (draftType === "projet") {
    return getCreationEditUrl("projet", id, slug);
  }

  if (draftType === "produit") {
    return getCreationEditUrl("produit", id, slug);
  }

  return getCreationEditUrl("action", id, slug);
}

export function getDraftViewUrl(
  draftType: string | undefined,
  id: string,
  slug: string,
): string {
  if (draftType === "action") {
    return `/creation/brouillons/${buildSlugPath(id, slug)}`;
  }

  return getDraftEditUrl(draftType, id, slug);
}

export function getCreationDashboardEditUrl(
  status: CreationStatusType,
  id: string,
  slug: string,
  type?: string,
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

  return getDraftEditUrl(type, id, slug);
}

export function getCreationDashboardViewUrl(
  status: CreationStatusType,
  id: string,
  slug: string,
  type?: string,
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

  return getDraftViewUrl(type, id, slug);
}
