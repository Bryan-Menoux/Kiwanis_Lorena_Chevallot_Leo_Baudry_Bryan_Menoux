import { isDataUrl } from '../../utils/utilitaires.js';
import {
  previewState,
  galleryFiles,
  galleryDataUrls,
  galleryOptimizationStates,
  setGalleryOptimizationStates,
} from './state.js';
import { updateHidden } from './init.js';

const GALLERY_THUMB_ATTR = 'data-gallery-thumb-index';
const OPTIMIZE_OVERLAY_ATTR = 'data-optimize-overlay';
const OPTIMIZE_FILL_ATTR = 'data-optimize-fill';
const OPTIMIZE_LABEL_ATTR = 'data-optimize-label';

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ensureGalleryProgressState(index) {
  const current = Array.isArray(galleryOptimizationStates)
    ? galleryOptimizationStates.slice()
    : [];
  while (current.length <= index) {
    current.push({ active: false, progress: 0 });
  }
  return current;
}

function createThumbnailOptimizationOverlay(progressState) {
  const safeProgress = clampPercent(progressState?.progress ?? 0);
  const isActive = Boolean(progressState?.active);

  const overlay = document.createElement('div');
  overlay.setAttribute(OPTIMIZE_OVERLAY_ATTR, 'true');
  overlay.className = 'absolute inset-0 pointer-events-none z-[5]';
  overlay.classList.toggle('hidden', !isActive);

  const fill = document.createElement('div');
  fill.setAttribute(OPTIMIZE_FILL_ATTR, 'true');
  fill.className = 'absolute inset-x-0 bottom-0 bg-black/50 transition-[height] duration-200 ease-linear';
  fill.style.height = `${safeProgress}%`;

  const label = document.createElement('p');
  label.setAttribute(OPTIMIZE_LABEL_ATTR, 'true');
  label.className = 'absolute inset-0 flex items-center justify-center text-sm font-semibold text-white drop-shadow';
  label.textContent = `${safeProgress}%`;

  overlay.appendChild(fill);
  overlay.appendChild(label);
  return overlay;
}

function applyGalleryThumbnailOptimizationDom(index, progress, isActive) {
  const container = document.getElementById('gallerySelected');
  if (!(container instanceof HTMLElement)) return;

  const thumb = container.querySelector(`[${GALLERY_THUMB_ATTR}="${index}"]`);
  if (!(thumb instanceof HTMLElement)) return;

  const overlay = thumb.querySelector(`[${OPTIMIZE_OVERLAY_ATTR}="true"]`);
  if (!(overlay instanceof HTMLElement)) return;

  const fill = overlay.querySelector(`[${OPTIMIZE_FILL_ATTR}="true"]`);
  const label = overlay.querySelector(`[${OPTIMIZE_LABEL_ATTR}="true"]`);
  if (!(fill instanceof HTMLElement) || !(label instanceof HTMLElement)) return;

  const safeProgress = clampPercent(progress);
  fill.style.height = `${safeProgress}%`;
  label.textContent = `${safeProgress}%`;
  overlay.classList.toggle('hidden', !isActive);
}

function setGalleryThumbnailOptimizationProgress(index, progress, isActive) {
  if (!Number.isInteger(index) || index < 0) return;

  const nextStates = ensureGalleryProgressState(index);
  nextStates[index] = {
    active: Boolean(isActive),
    progress: clampPercent(progress),
  };
  setGalleryOptimizationStates(nextStates);
  applyGalleryThumbnailOptimizationDom(index, progress, isActive);
}

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
  const applyAndReveal = () => {
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      try {
        window.setGridStyles();
      } catch (error) {
        // no-op
      }
    }

    if (!photoGrid.__previewBound) {
      photoGrid.addEventListener('click', (event) => {
        const photoElement =
          event.target.closest && event.target.closest('[data-photo-index]')
            ? event.target.closest('[data-photo-index]')
            : null;
        if (!photoElement) return;

        const photoUrl = photoElement.getAttribute('data-photo-url');
        if (!photoUrl) return;

        if (typeof window !== 'undefined' && typeof window.openModal === 'function') {
          try {
            window.openModal(photoUrl);
          } catch (error) {
            // no-op
          }
        }
      });
      photoGrid.__previewBound = true;
    }
  };

  applyAndReveal();

  galleryImageElements.forEach((imageElement) => {
    if (imageElement.complete && imageElement.naturalWidth) return;
    const onStateChange = () => applyAndReveal();
    imageElement.addEventListener('load', onStateChange, { once: true });
    imageElement.addEventListener('error', onStateChange, { once: true });
  });
}

function renderFormGalleryThumbnails() {
  const container = document.getElementById('gallerySelected');
  if (!container) return;
  container.innerHTML = '';

  galleryDataUrls.forEach((dataUrl, index) => {
    const thumbnailWrap = document.createElement('div');
    thumbnailWrap.className = 'relative overflow-hidden rounded-md';
    thumbnailWrap.style.paddingBottom = '100%';
    thumbnailWrap.setAttribute(GALLERY_THUMB_ATTR, String(index));

    const thumbnailImage = document.createElement('img');
    thumbnailImage.src = dataUrl;
    thumbnailImage.alt = 'Miniature';
    thumbnailImage.className = 'absolute inset-0 w-full h-full object-cover';
    thumbnailWrap.appendChild(thumbnailImage);

    thumbnailWrap.appendChild(createThumbnailOptimizationOverlay(galleryOptimizationStates[index]));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className =
      'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center z-10';
    removeButton.setAttribute('data-gallery-index', String(index));
    removeButton.textContent = '\u2716';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  if (!container.__galleryBound) {
    container.addEventListener('click', (event) => {
      const clickedButton =
        event.target.closest && event.target.closest('[data-gallery-index]');
      if (!clickedButton) return;

      const removeIndex = parseInt(clickedButton.getAttribute('data-gallery-index'), 10);
      if (Number.isNaN(removeIndex)) return;

      galleryFiles.splice(removeIndex, 1);
      galleryDataUrls.splice(removeIndex, 1);

      const nextOptimizationStates = galleryOptimizationStates.slice();
      nextOptimizationStates.splice(removeIndex, 1);
      setGalleryOptimizationStates(nextOptimizationStates);

      const fileInput = document.getElementById('input_galerie_photos');
      if (fileInput) {
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

  existingPhotoUrls.forEach((photoUrl) => {
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
    removeButton.textContent = '\u2716';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  if (!container.__bound) {
    container.addEventListener('click', (event) => {
      const clickedButton =
        event.target.closest && event.target.closest('[data-remove-url]');
      if (!clickedButton) return;

      event.stopPropagation();
      const photoUrl = clickedButton.getAttribute('data-remove-url');
      if (!photoUrl) return;

      const hiddenRemoveInput = document.getElementById('hidden_remove_galerie_photos');
      container.__removed = container.__removed || [];
      container.__removed.push(photoUrl);
      if (hiddenRemoveInput) hiddenRemoveInput.value = JSON.stringify(container.__removed);

      previewState.galerie_photos = (previewState.galerie_photos || []).filter(
        (url) => url !== photoUrl,
      );
      const remainingExisting = (previewState.galerie_photos || []).filter(
        (url) => typeof url === 'string' && !isDataUrl(url),
      );

      renderExistingThumbnails(remainingExisting);
      renderGallery(previewState.galerie_photos || []);
      updateHidden('galerie_photos');
    });
    container.__bound = true;
  }
}

export {
  renderGallery,
  renderFormGalleryThumbnails,
  renderExistingThumbnails,
  setGalleryThumbnailOptimizationProgress,
};
