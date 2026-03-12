// Génère le HTML des contrôles de pagination côté client.
// Retourne une chaîne vide si une seule page (ou moins) est disponible.
// Toutes les options sont facultatives et ont des valeurs par défaut.
export function renderPagination(
  totalPages: number,
  currentPage: number,
  options: {
    // Libellés des boutons précédent / suivant
    prevLabel?: string;
    nextLabel?: string;
    // Classe CSS de l'élément conteneur
    wrapperClass?: string;
    // Affiche ou non les boutons Précédent / Suivant (true par défaut)
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

  const pageButtons = Array.from({ length: totalPages }, (_, i) => {
    const n = i + 1;
    const cls = n === currentPage ? activeButtonClass : buttonClass;
    return `<button type="button" class="${cls}" data-page-action="go" data-page="${n}">${n}</button>`;
  }).join("");

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
