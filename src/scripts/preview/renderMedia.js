import PREVIEW_DEFAULTS from '../previewDefaults.js';
import {
  galleryDataUrls,
  galleryExistingUrls,
  galleryOptimizationStates,
  getDerivedState,
  normalizeProp,
  previewState,
  singleImageOptimizationStates,
} from './state.js';

const GALLERY_THUMB_ATTR = 'data-gallery-thumb-index';
const OPTIMIZE_OVERLAY_ATTR = 'data-optimize-overlay';
const OPTIMIZE_FILL_ATTR = 'data-optimize-fill';
const OPTIMIZE_LABEL_ATTR = 'data-optimize-label';

function isDefaultPlaceholderImage(prop, value) {
  const canonicalProp = normalizeProp(prop);
  const defaultValue = PREVIEW_DEFAULTS[canonicalProp];
  return (
    typeof value === 'string' &&
    typeof defaultValue === 'string' &&
    value === defaultValue
  );
}

function createThumbnailOptimizationOverlay(progressState) {
  const safeProgress = Number.isFinite(Number(progressState?.progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progressState.progress))))
    : 0;
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

function updateOptimizationOverlay(container, selector, progressState) {
  if (!(container instanceof HTMLElement)) return;
  const target = container.querySelector(selector);
  if (!(target instanceof HTMLElement)) return;

  const overlay = target.querySelector(`[${OPTIMIZE_OVERLAY_ATTR}="true"]`);
  if (!(overlay instanceof HTMLElement)) return;

  const fill = overlay.querySelector(`[${OPTIMIZE_FILL_ATTR}="true"]`);
  const label = overlay.querySelector(`[${OPTIMIZE_LABEL_ATTR}="true"]`);
  if (!(fill instanceof HTMLElement) || !(label instanceof HTMLElement)) return;

  const safeProgress = Number.isFinite(Number(progressState?.progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progressState.progress))))
    : 0;
  fill.style.height = `${safeProgress}%`;
  label.textContent = `${safeProgress}%`;
  overlay.classList.toggle('hidden', !progressState?.active);
}

function renderSingleImageOptimizationProgress(prop) {
  const canonicalProp = normalizeProp(prop);
  const container = document.getElementById(`preview_${canonicalProp}`);
  if (!(container instanceof HTMLElement)) return;

  const progressState = singleImageOptimizationStates[canonicalProp];
  updateOptimizationOverlay(container, `[data-delete-image="${canonicalProp}"]`, progressState);
}

function renderGalleryThumbnailOptimizationProgress(index) {
  if (!Number.isInteger(index) || index < 0) return;

  const container = document.getElementById('gallerySelected');
  if (!(container instanceof HTMLElement)) return;

  const thumb = container.querySelector(`[${GALLERY_THUMB_ATTR}="${index}"]`);
  if (!(thumb instanceof HTMLElement)) return;

  const overlay = thumb.querySelector(`[${OPTIMIZE_OVERLAY_ATTR}="true"]`);
  if (!(overlay instanceof HTMLElement)) return;

  const fill = overlay.querySelector(`[${OPTIMIZE_FILL_ATTR}="true"]`);
  const label = overlay.querySelector(`[${OPTIMIZE_LABEL_ATTR}="true"]`);
  if (!(fill instanceof HTMLElement) || !(label instanceof HTMLElement)) return;

  const progressState = galleryOptimizationStates[index];
  const safeProgress = Number.isFinite(Number(progressState?.progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progressState.progress))))
    : 0;
  fill.style.height = `${safeProgress}%`;
  label.textContent = `${safeProgress}%`;
  overlay.classList.toggle('hidden', !progressState?.active);
}

function renderSingleImagePreview(prop) {
  const canonicalProp = normalizeProp(prop);
  const container = document.getElementById(`preview_${canonicalProp}`);
  if (!(container instanceof HTMLElement)) return;

  container.innerHTML = '';
  const derived = getDerivedState();
  const value = derived.values[canonicalProp];
  if (!value || !String(value).trim() || isDefaultPlaceholderImage(canonicalProp, value)) {
    return;
  }

  const previewWrap = document.createElement('div');
  previewWrap.className = 'relative w-full overflow-hidden rounded-md';
  previewWrap.style.paddingBottom = '56%';
  previewWrap.setAttribute('data-delete-image', canonicalProp);

  const previewImage = document.createElement('img');
  previewImage.src = value;
  previewImage.alt = 'Aperçu';
  previewImage.className = 'absolute inset-0 w-full h-full object-cover';
  previewImage.loading = 'lazy';
  previewImage.decoding = 'async';
  previewWrap.appendChild(previewImage);

  const progressState = singleImageOptimizationStates[canonicalProp];
  previewWrap.appendChild(createThumbnailOptimizationOverlay(progressState));

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'delete-image-btn absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
  removeButton.title = 'Supprimer l\'image';
  removeButton.setAttribute('aria-label', 'Supprimer l\'image');
  removeButton.textContent = 'x';
  previewWrap.appendChild(removeButton);

  const labelWrap = document.createElement('div');
  labelWrap.className = 'absolute top-2 left-2 z-10';
  const labelP = document.createElement('p');
  labelP.className = 'text-xs text-white bg-black/60 px-2 py-1 rounded';
  labelP.textContent = 'Photo actuelle';
  labelWrap.appendChild(labelP);
  previewWrap.appendChild(labelWrap);

  container.appendChild(previewWrap);
}

function renderGallery(photoUrls = null) {
  const previewRoot = document.getElementById('actionPreview');
  if (!previewRoot) return;

  const photoGrid = previewRoot.querySelector('#photoGrid');
  if (!(photoGrid instanceof HTMLElement)) return;

  const gallerieSection = previewRoot.querySelector('#gallerieSection');
  const urls = Array.isArray(photoUrls)
    ? photoUrls
    : Array.isArray(previewState.galerie_photos)
      ? previewState.galerie_photos
      : [];

  photoGrid.innerHTML = '';

  if (!urls.length) {
    if (gallerieSection instanceof HTMLElement) {
      gallerieSection.style.display = 'none';
    }
    return;
  }

  if (gallerieSection instanceof HTMLElement) {
    gallerieSection.style.display = '';
  }

  urls.forEach((photoUrl, index) => {
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

  photoGrid.dataset.photoCount = String(urls.length);

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
  if (!(container instanceof HTMLElement)) return;

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
    removeButton.textContent = 'x';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });
}

function renderExistingThumbnails(existingPhotoUrls = null) {
  const container = document.getElementById('galleryExisting');
  if (!(container instanceof HTMLElement)) return;

  container.innerHTML = '';

  const urls = Array.isArray(existingPhotoUrls)
    ? existingPhotoUrls
    : galleryExistingUrls;

  urls.forEach((photoUrl) => {
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
    removeButton.className =
      'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
    removeButton.setAttribute('data-remove-url', photoUrl);
    removeButton.textContent = 'x';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });
}

export {
  createThumbnailOptimizationOverlay,
  renderSingleImageOptimizationProgress,
  renderGalleryThumbnailOptimizationProgress,
  renderSingleImagePreview,
  renderGallery,
  renderFormGalleryThumbnails,
  renderExistingThumbnails,
  isDefaultPlaceholderImage,
};
