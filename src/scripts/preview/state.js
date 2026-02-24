// Execution state for live preview
let previewState = {};

// Gallery files selected by user
let galleryFiles = [];
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
