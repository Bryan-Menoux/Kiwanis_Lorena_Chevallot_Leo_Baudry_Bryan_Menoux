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

  const count = parseInt(grid.dataset.photoCount || "0");
  if (count === 0) return;

  const imgs = grid.querySelectorAll("img");
  const orientations = Array.from(imgs).map((img) => {
    return img.naturalHeight > img.naturalWidth ? "portrait" : "landscape";
  });

  const divs = grid.querySelectorAll(".relative");

  // Configuration pour desktop (>= 768px)
  if (window.innerWidth >= 768) {
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gridTemplateRows = count <= 2 ? "1fr" : "1fr 1fr";

    let areas: string[] = [];
    let template = "";

    if (count === 1) {
      areas = ["a"];
      template = '"a"';
    } else if (count === 2) {
      areas = ["a", "b"];
      template = '"a b"';
    } else if (count === 3) {
      const portraitIndex = orientations.findIndex((o) => o === "portrait");
      if (portraitIndex !== -1) {
        areas = new Array(3);
        areas[portraitIndex] = "c";
        let letterIdx = 0;
        for (let i = 0; i < 3; i++) {
          if (i !== portraitIndex) {
            areas[i] = String.fromCharCode(97 + letterIdx++);
          }
        }
      } else {
        areas = ["a", "b", "c"];
      }
      template = '"a c" "b c"';
    } else if (count === 4) {
      areas = ["a", "b", "c", "d"];
      template = '"a b" "c d"';
    } else {
      // 5+ images : afficher 2x2 + reste
      areas = Array.from({ length: count }, (_, i) =>
        String.fromCharCode(97 + i)
      );
      template = '"a b" "c d"';
    }

    grid.style.gridTemplateAreas = template;
    divs.forEach((div, i) => {
      (div as HTMLElement).style.gridArea = areas[i] || "";
    });
  } else {
    // Configuration pour mobile (< 768px)
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gridTemplateRows = `repeat(${count}, 1fr)`;

    const areas = Array.from(
      { length: count },
      (_, i) => String.fromCharCode(97 + i)
    );
    const template = areas.map((a) => `"${a}"`).join(" ");

    grid.style.gridTemplateAreas = template;
    divs.forEach((div, i) => {
      (div as HTMLElement).style.gridArea = areas[i] || "";
    });
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
