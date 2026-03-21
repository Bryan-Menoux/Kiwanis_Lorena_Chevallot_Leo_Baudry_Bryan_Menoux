import slugify from "slugify";
import {
  formatDateShort,
  formatDateWithTime,
  resolveCreatorName,
} from "../utils/utilitaires.js";

export type CreationDashboardStatus =
  | "actions"
  | "projets"
  | "produits"
  | "brouillon";

export interface CreationDashboardPage {
  id: string;
  title: string;
  slug: string;
  status: CreationDashboardStatus;
  updatedAt: string;
  authorName: string;
  beneficiary?: string;
  displayDate?: string;
}

export interface CreationDashboardStats {
  actions: number;
  projets: number;
  produits: number;
  brouillons: number;
  total: number;
}

export interface CreationDashboardCollections {
  actions?: any[];
  projets?: any[];
  produits?: any[];
  brouillons?: any[];
}

function asSafeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function safeSlug(value: unknown, fallback = "element"): string {
  const base = asSafeText(value, fallback);
  const slug = slugify(base, { lower: true, strict: true });
  return slug || fallback;
}

function mapActionDisplayDate(dateStart?: string | null): string {
  if (!dateStart) return "";
  return formatDateShort(dateStart);
}

export function mapCreationDashboardPages(
  collections: CreationDashboardCollections,
): CreationDashboardPage[] {
  const actions = Array.isArray(collections.actions) ? collections.actions : [];
  const projets = Array.isArray(collections.projets) ? collections.projets : [];
  const produits = Array.isArray(collections.produits) ? collections.produits : [];
  const brouillons = Array.isArray(collections.brouillons) ? collections.brouillons : [];

  return [
    ...actions.map((action) => ({
      id: action.id,
      title: asSafeText(action.titre, "Action sans titre"),
      slug: safeSlug(action.titre, "action"),
      status: "actions" as const,
      updatedAt: action.updated,
      authorName: resolveCreatorName(action) || "Auteur inconnu",
      beneficiary: action.beneficiaire,
      displayDate: mapActionDisplayDate(action.date_debut),
    })),
    ...projets.map((projet) => ({
      id: projet.id,
      title: asSafeText(projet.titre, "Projet sans titre"),
      slug: safeSlug(projet.titre, "projet"),
      status: "projets" as const,
      updatedAt: projet.updated,
      authorName: resolveCreatorName(projet) || "Auteur inconnu",
      displayDate: projet.date ? formatDateShort(projet.date) : "",
    })),
    ...produits.map((produit) => ({
      id: produit.id,
      title: asSafeText(produit.titre, "Produit sans titre"),
      slug: safeSlug(produit.titre, "produit"),
      status: "produits" as const,
      updatedAt: produit.updated,
      authorName: resolveCreatorName(produit) || "Auteur inconnu",
      displayDate: formatDateWithTime(produit.updated),
    })),
    ...brouillons.map((brouillon) => ({
      id: brouillon.id,
      title: asSafeText(brouillon.titre, "Brouillon sans titre"),
      slug: safeSlug(brouillon.titre, "brouillon"),
      status: "brouillon" as const,
      updatedAt: brouillon.updated,
      authorName: resolveCreatorName(brouillon) || "Auteur inconnu",
      displayDate: formatDateWithTime(brouillon.updated),
    })),
  ].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

export function computeCreationDashboardStats(
  pages: CreationDashboardPage[],
): CreationDashboardStats {
  return {
    actions: pages.filter((page) => page.status === "actions").length,
    projets: pages.filter((page) => page.status === "projets").length,
    produits: pages.filter((page) => page.status === "produits").length,
    brouillons: pages.filter((page) => page.status === "brouillon").length,
    total: pages.length,
  };
}
