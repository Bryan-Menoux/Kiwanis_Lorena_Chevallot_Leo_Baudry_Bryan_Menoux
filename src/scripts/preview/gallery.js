import { isDataUrl } from '../../utils/utilitaires.js';
import {
  previewState,
  galleryFiles,
  galleryDataUrls,
  setGalleryFiles,
  setGalleryDataUrls,
} from './state.js';
import { updateHidden } from './init.js';

function renderGallery(photoUrls) {
  const previewRoot = document.getElementById('actionPreview');
  if (!previewRoot) return;

  const photoGrid = previewRoot.querySelector('#photoGrid');
  if (!photoGrid) return;

  const gallerieSection = previewRoot.querySelector('#gallerieSection');

  photoGrid.innerHTML = '';

  if (!photoUrls || photoUrls.length === 0) {
    if (gallerieSection) gallerieSection.style.display = 'none';
    return;
  }

  if (gallerieSection) gallerieSection.style.display = '';

  photoUrls.forEach((photoUrl, index) => {
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'overflow-hidden rounded-box cursor-pointer';
    thumbnailDiv.setAttribute('data-photo-index', String(index));
    thumbnailDiv.setAttribute('data-photo-url', photoUrl);

    const thumbnailImage = document.createElement('img');
    thumbnailImage.alt = 'Photo de la galerie';
    thumbnailImage.className = 'w-full h-[50dvh] object-cover block';
    thumbnailImage.src = photoUrl;
    thumbnailImage.loading = 'lazy';
    thumbnailImage.decoding = 'async';
    thumbnailDiv.appendChild(thumbnailImage);

    photoGrid.appendChild(thumbnailDiv);
  });
  photoGrid.dataset.photoCount = String(photoUrls.length);

  const galleryImageElements = photoGrid.querySelectorAll('img');
  let loadedCount = 0;
  const applyAndReveal = () => {
    // Recalcule la grille seulement quand toutes les images sont prêtes.
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      try { window.setGridStyles(); } catch (error) {}
    }

    if (!photoGrid.__previewBound) {
      // Délégation d'événement : évite un écouteur par vignette.
      photoGrid.addEventListener('click', function (event) {
        const photoElement = event.target.closest && event.target.closest('[data-photo-index]') ? event.target.closest('[data-photo-index]') : null;
        if (photoElement) {
          const photoUrl = photoElement.getAttribute('data-photo-url');
          if (photoUrl && typeof window !== 'undefined' && typeof window.openModal === 'function') {
            try { window.openModal(photoUrl); } catch (err) {}
          }
        }
      });
      photoGrid.__previewBound = true;
    }
  };

  if (galleryImageElements.length === 0) {
    applyAndReveal();
  } else {
    galleryImageElements.forEach((imageElement) => {
      if (imageElement.complete) {
        loadedCount += 1;
        if (loadedCount === galleryImageElements.length) applyAndReveal();
      } else {
        imageElement.addEventListener('load', () => {
          loadedCount += 1;
          if (loadedCount === galleryImageElements.length) applyAndReveal();
        });
        imageElement.addEventListener('error', () => {
          loadedCount += 1;
          if (loadedCount === galleryImageElements.length) applyAndReveal();
        });
      }
    });
  }
}

function renderFormGalleryThumbnails() {
  const container = document.getElementById('gallerySelected');
  if (!container) return;
  container.innerHTML = '';

  galleryDataUrls.forEach((dataUrl, index) => {
    const thumbnailWrap = document.createElement('div');
    thumbnailWrap.className = 'relative overflow-hidden rounded-md';
    thumbnailWrap.style.paddingBottom = '100%';

    const thumbnailImage = document.createElement('img');
    thumbnailImage.src = dataUrl;
    thumbnailImage.alt = 'Miniature';
    thumbnailImage.className = 'absolute inset-0 w-full h-full object-cover';
    thumbnailWrap.appendChild(thumbnailImage);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
    removeButton.setAttribute('data-gallery-index', String(index));
    removeButton.innerHTML = 'x';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  if (!container.__galleryBound) {
    container.addEventListener('click', function (event) {
      const clickedButton = event.target.closest && event.target.closest('[data-gallery-index]');
      if (!clickedButton) return;
      const removeIndex = parseInt(clickedButton.getAttribute('data-gallery-index'), 10);
      if (Number.isNaN(removeIndex)) return;

      galleryFiles.splice(removeIndex, 1);
      galleryDataUrls.splice(removeIndex, 1);

      const fileInput = document.getElementById('input_galerie_photos');
      if (fileInput) {
        // On reconstruit FileList via DataTransfer (FileList natif est en lecture seule).
        const dt = new DataTransfer();
        galleryFiles.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
      }

      const serverUrls = Array.isArray(previewState.galerie_photos)
        ? previewState.galerie_photos.filter((u) => typeof u === 'string' && !isDataUrl(u))
        : [];
      previewState.galerie_photos = serverUrls.concat(galleryDataUrls);
      renderGallery(previewState.galerie_photos);
      updateHidden('galerie_photos');
      renderFormGalleryThumbnails();
    });
    container.__galleryBound = true;
  }
}

function renderExistingThumbnails(existingPhotoUrls) {
  const container = document.getElementById('galleryExisting');
  if (!container) return;
  container.innerHTML = '';
  existingPhotoUrls.forEach((photoUrl, index) => {
    const thumbnailWrap = document.createElement('div');
    thumbnailWrap.className = 'relative overflow-hidden rounded-md';
    thumbnailWrap.style.paddingBottom = '100%';

    const existingImage = document.createElement('img');
    existingImage.src = photoUrl;
    existingImage.alt = 'Miniature existante';
    existingImage.className = 'absolute inset-0 w-full h-full object-cover';
    thumbnailWrap.appendChild(existingImage);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
    removeButton.setAttribute('data-remove-url', photoUrl);
    removeButton.innerHTML = 'x';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  if (!container.__bound) {
    container.addEventListener('click', function (event) {
      const clickedButton = event.target.closest && event.target.closest('[data-remove-url]');
      if (!clickedButton) return;
      event.stopPropagation();
      const photoUrl = clickedButton.getAttribute('data-remove-url');
      if (!photoUrl) return;

      const hiddenRemoveInput = document.getElementById('hidden_remove_galerie_photos');
      // On accumule les suppressions pour que le serveur retire aussi les anciennes images.
      container.__removed = container.__removed || [];
      container.__removed.push(photoUrl);
      if (hiddenRemoveInput) hiddenRemoveInput.value = JSON.stringify(container.__removed);

      previewState.galerie_photos = (previewState.galerie_photos || []).filter((url) => url !== photoUrl);
      const remainingExisting = (previewState.galerie_photos || []).filter((url) => typeof url === 'string' && !isDataUrl(url));
      renderExistingThumbnails(remainingExisting);
      renderGallery(previewState.galerie_photos || []);
      updateHidden('galerie_photos');
    });
    container.__bound = true;
  }
}

export { renderGallery, renderFormGalleryThumbnails, renderExistingThumbnails };

