/**
 * Utilitaire centralisé pour la gestion des galeries photo
 * Logique mutualisée entre les pages d'affichage et de création
 */

export interface GalleryConfig {
  gridSelector: string;
  photoContainerSelector?: string;
  imgSelector?: string;
}

/**
 * Calcule et applique les styles de grille en fonction du nombre et de l'orientation des images
 * @param grid - Élément du conteneur de grille
 */
export function setGridStyles(grid: HTMLElement): void {
  if (!grid) return;

  const count = Math.max(0, parseInt(grid.dataset.photoCount || "0"));
  const items = Array.from(grid.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

  // Classes to remove from grid (only these, keep others intact)
  const gridClassesToRemove = [
    "md:grid-cols-1",
    "md:grid-cols-2",
    "md:grid-rows-2",
    "md:grid-rows-3",
  ];
  gridClassesToRemove.forEach((c) => grid.classList.remove(c));

  // Classes to remove from items
  const itemClassesToRemove = [
    "md:row-span-2",
    "md:col-span-2",
    "md:col-start-2",
    "md:col-start-1",
    "md:row-start-1",
    "md:row-start-2",
  ];
  items.forEach((it) => itemClassesToRemove.forEach((c) => it.classList.remove(c)));

  if (count === 0) return;

  // Desktop behavior only: add md: classes based on count
  if (window.innerWidth >= 768) {
    if (count === 1) {
      grid.classList.add("md:grid-cols-1");
      return;
    }

    if (count === 2) {
      grid.classList.add("md:grid-cols-2");
      return;
    }

    if (count === 3) {
      grid.classList.add("md:grid-cols-2", "md:grid-rows-2");

      // Look at first three items (do not change DOM order)
      const firstThree = items.slice(0, 3);

      // Find a portrait image among them
      let portraitIdx = -1;
      for (let i = 0; i < firstThree.length; i++) {
        const img = firstThree[i].querySelector("img") as HTMLImageElement | null;
        if (img && img.naturalHeight > img.naturalWidth) {
          portraitIdx = i;
          break;
        }
      }

      if (portraitIdx === -1) {
        // default to the third item if exists
        portraitIdx = firstThree.length >= 3 ? 2 : firstThree.length - 1;
      }

      if (portraitIdx >= 0 && firstThree[portraitIdx]) {
        // span two rows and force column start 2 so the large image sits on the right
        firstThree[portraitIdx].classList.add("md:row-span-2", "md:col-start-2", "md:row-start-1");

        // For the two other items, force them on the left: first->row-start-1, second->row-start-2
        const others: HTMLElement[] = [];
        for (let i = 0; i < firstThree.length; i++) {
          if (i !== portraitIdx && firstThree[i]) others.push(firstThree[i]);
        }
        if (others[0]) {
          others[0].classList.add("md:col-start-1", "md:row-start-1");
        }
        if (others[1]) {
          others[1].classList.add("md:col-start-1", "md:row-start-2");
        }
      }

      return;
    }

    if (count === 4) {
      grid.classList.add("md:grid-cols-2", "md:grid-rows-2");
      return;
    }

    if (count === 5) {
      grid.classList.add("md:grid-cols-2", "md:grid-rows-3");
      if (items[4]) items[4].classList.add("md:col-span-2");
      return;
    }

    // 6 or more
    grid.classList.add("md:grid-cols-2", "md:grid-rows-3");
  }
}

/**
 * Initialise la galerie avec les événements et styles
 */
export function initializeGallery(): void {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  // Appliquer les styles initialement
  setGridStyles(grid);

  // Réappliquer les styles au redimensionnement
  const resizeHandler = () => setGridStyles(grid);
  window.addEventListener("resize", resizeHandler);

  // Cleanup
  const cleanup = () => window.removeEventListener("resize", resizeHandler);
  return cleanup as any;
}

/**
 * Gestion du modal d'images
 */
export function setupModalHandlers(): void {
  const closeButton = document.getElementById("closeButton");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const modal = document.getElementById("imageModal");

  if (closeButton) {
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      closeModal();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(-1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(1);
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

/**
 * Récupère les URLs des photos depuis le grid
 */
export function getPhotoUrls(): string[] {
  const photoElements = document.querySelectorAll("[data-photo-url]");
  return Array.from(photoElements).map((el) => el.getAttribute("data-photo-url") || "");
}

/**
 * Ouvre le modal et affiche une image
 */
let currentIndex = 0;

export function openModal(index: number): void {
  const photos = document.querySelectorAll("#photoGrid [data-photo-url]");
  if (!photos[index]) return;

  const url = photos[index].getAttribute("data-photo-url");
  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage") as HTMLImageElement;

  if (modal && modalImage && url) {
    modalImage.src = url;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    currentIndex = index;
  }
}

/**
 * Ferme le modal
 */
export function closeModal(): void {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

/**
 * Navigue entre les images du modal
 */
export function navigate(direction: number): void {
  const photos = document.querySelectorAll("#photoGrid [data-photo-url]");
  currentIndex = (currentIndex + direction + photos.length) % photos.length;
  openModal(currentIndex);
}
