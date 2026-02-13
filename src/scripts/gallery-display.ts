/**
 * Script de galerie pour la page d'affichage (lecture seule)
 * Utilise les utilitaires centralisés de gallery.ts
 */

import {
  setGridStyles,
  openModal,
  setupModalHandlers,
} from "../utils/gallery";

document.addEventListener("DOMContentLoaded", () => {
  // Initialiser les styles de la grille
  const grid = document.getElementById("photoGrid");
  if (grid) {
    // Applique les styles puis révèle la grille pour éviter un flash
    const applyStylesAndReveal = () => {
      setGridStyles(grid);
      grid.classList.remove("opacity-0");
    };

    // Attendre que toutes les images soient chargées
    const imgs = grid.querySelectorAll("img");
    let loadedCount = 0;

    if (imgs.length === 0) {
      applyStylesAndReveal();
    } else {
      imgs.forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === imgs.length) {
            applyStylesAndReveal();
          }
        } else {
          img.addEventListener("load", () => {
            loadedCount++;
            if (loadedCount === imgs.length) {
              applyStylesAndReveal();
            }
          });
        }
      });
    }

    // Réappliquer les styles au redimensionnement
    window.addEventListener("resize", () => setGridStyles(grid));
  }

  // Initialiser le modal et les événements
  setupModalHandlers();

  // Délégation d'événement pour les clics sur les photos
  const photoGrid = document.getElementById("photoGrid");
  if (photoGrid) {
    photoGrid.addEventListener("click", function (e) {
      const target = (e.target as HTMLElement).closest(
        "[data-photo-url]"
      ) as HTMLElement;
      if (target) {
        const photos = Array.from(photoGrid.querySelectorAll("[data-photo-url]"));
        const index = photos.indexOf(target);
        if (index !== -1) {
          openModal(index);
        }
      }
    });
  }
});
