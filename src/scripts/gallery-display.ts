/**
 * Script de galerie pour la page d'affichage (lecture seule)
 * Utilise les utilitaires centralisés de gallery.ts
 */

import {
  setGridStyles,
  openModal,
  closeModal,
  navigate,
  setupModalHandlers,
} from "../utils/gallery";

document.addEventListener("DOMContentLoaded", () => {
  // Initialiser les styles de la grille
  const grid = document.getElementById("photoGrid");
  if (grid) {
    // Attendre que toutes les images soient chargées
    const imgs = grid.querySelectorAll("img");
    let loadedCount = 0;

    if (imgs.length === 0) {
      setGridStyles(grid);
    } else {
      imgs.forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === imgs.length) {
            setGridStyles(grid);
          }
        } else {
          img.addEventListener("load", () => {
            loadedCount++;
            if (loadedCount === imgs.length) {
              setGridStyles(grid);
            }
          });
        }
      });
    }

    // Réappliquer les styles au redimensionnement
    window.addEventListener("resize", () => setGridStyles(grid));
  }

  // Setup du modal et des événements
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
