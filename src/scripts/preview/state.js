// État source de la prévisualisation en direct.
// Tous les scripts de prévisualisation lisent/écrivent dans ces variables.
let previewState = {};

// Fichiers galerie ajoutés côté client (non encore persistés serveur).
let galleryFiles = [];
// Versions Data URL des fichiers galerie pour affichage immédiat.
let galleryDataUrls = [];

function setPreviewState(value) {
  previewState = value;
}

function setGalleryFiles(value) {
  galleryFiles = value;
}

function setGalleryDataUrls(value) {
  galleryDataUrls = value;
}

export {
  previewState,
  galleryFiles,
  galleryDataUrls,
  setPreviewState,
  setGalleryFiles,
  setGalleryDataUrls,
};
