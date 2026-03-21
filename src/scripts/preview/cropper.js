import { applyPreviewCropStyle, syncPreviewCropStyles } from './renderMedia.js';
import {
  getImageCropValue,
  normalizeProp,
  resetImageCropValue,
  setImageCropValue,
} from './state.js';

const MODAL_ID = 'preview-image-crop-modal';
const PREVIEW_CROP_SELECTOR = '[data-preview-crop-field]';
const MODAL_IMAGE_SELECTOR = '[data-crop-modal-image]';
const MODAL_CANVAS_SELECTOR = '[data-crop-canvas]';
const MODAL_MARKER_SELECTOR = '[data-crop-marker]';
const MODAL_POSITION_SELECTOR = '[data-crop-position]';

function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 50;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function getCropLabel(x, y) {
  if (x === 50 && y === 50) return 'Cadrage centré';
  return `Cadrage ${x}% / ${y}%`;
}

function applyCropToField(prop) {
  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  const images = document.querySelectorAll(
    `${PREVIEW_CROP_SELECTOR}[data-preview-crop-field="${canonicalProp}"]`,
  );
  images.forEach((image) => {
    applyPreviewCropStyle(image, canonicalProp);
  });
}

function getCropPointFromPointer(canvas, modalImage, event, currentCrop) {
  if (!(canvas instanceof HTMLElement)) return null;
  if (!(modalImage instanceof HTMLImageElement)) return null;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const naturalWidth = Number(modalImage.naturalWidth) || rect.width;
  const naturalHeight = Number(modalImage.naturalHeight) || rect.height;
  if (!naturalWidth || !naturalHeight) return null;

  const scale = Math.max(rect.width / naturalWidth, rect.height / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const cropX = clampPercent(currentCrop?.x ?? 50) / 100;
  const cropY = clampPercent(currentCrop?.y ?? 50) / 100;
  const offsetX = (rect.width - renderedWidth) * cropX;
  const offsetY = (rect.height - renderedHeight) * cropY;
  const x = clampPercent(
    ((event.clientX - rect.left - offsetX) / renderedWidth) * 100,
  );
  const y = clampPercent(
    ((event.clientY - rect.top - offsetY) / renderedHeight) * 100,
  );

  return { x, y };
}

function notifyFormModified() {
  const form = document.getElementById('leftForm');
  if (form instanceof HTMLFormElement) {
    form.dispatchEvent(
      new CustomEvent('kc:action-form-modified', { bubbles: true }),
    );
  }
}

function syncAllCropStyles() {
  const images = document.querySelectorAll(PREVIEW_CROP_SELECTOR);
  images.forEach((image) => {
    const prop = image.getAttribute('data-preview-crop-field') || '';
    applyPreviewCropStyle(image, prop);
  });
}

function updateModalState(modal, prop, sourceImage) {
  if (!(modal instanceof HTMLDialogElement)) return;

  const modalImage = modal.querySelector(MODAL_IMAGE_SELECTOR);
  const canvas = modal.querySelector(MODAL_CANVAS_SELECTOR);
  const marker = modal.querySelector(MODAL_MARKER_SELECTOR);
  const positionNode = modal.querySelector(MODAL_POSITION_SELECTOR);

  if (!(modalImage instanceof HTMLImageElement)) return;
  if (!(canvas instanceof HTMLElement)) return;

  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  const crop = getImageCropValue(canonicalProp);
  const sourceSrc = sourceImage instanceof HTMLImageElement
    ? (sourceImage.currentSrc || sourceImage.src || '')
    : '';
  const sourceAlt = sourceImage instanceof HTMLImageElement ? sourceImage.alt || '' : '';

  modal.dataset.cropField = canonicalProp;
  modalImage.src = sourceSrc;
  modalImage.alt = sourceAlt;
  modalImage.style.objectFit = 'cover';
  modalImage.style.objectPosition = `${crop.x}% ${crop.y}%`;

  if (marker instanceof HTMLElement) {
    marker.style.left = `${crop.x}%`;
    marker.style.top = `${crop.y}%`;
  }

  if (positionNode instanceof HTMLElement) {
    positionNode.textContent = getCropLabel(crop.x, crop.y);
  }

  syncPreviewCropStyles(canonicalProp);
}

function openCropModal(sourceImage) {
  const modal = document.getElementById(MODAL_ID);
  if (!(modal instanceof HTMLDialogElement)) return;
  if (!(sourceImage instanceof HTMLImageElement)) return;

  const prop = sourceImage.getAttribute('data-preview-crop-field') || '';
  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  updateModalState(modal, canonicalProp, sourceImage);
  if (!modal.open) modal.showModal();
}

function applyCropFromPointer(modal, event) {
  if (!(modal instanceof HTMLDialogElement)) return;
  const canvas = modal.querySelector(MODAL_CANVAS_SELECTOR);
  const marker = modal.querySelector(MODAL_MARKER_SELECTOR);
  const positionNode = modal.querySelector(MODAL_POSITION_SELECTOR);
  const modalImage = modal.querySelector(MODAL_IMAGE_SELECTOR);

  if (!(canvas instanceof HTMLElement)) return;
  if (!(modalImage instanceof HTMLImageElement)) return;

  const field = modal.dataset.cropField || '';
  const canonicalProp = normalizeProp(field);
  if (!canonicalProp) return;
  const currentCrop = getImageCropValue(canonicalProp);

  const point = getCropPointFromPointer(canvas, modalImage, event, currentCrop);
  if (!point) return;
  const { x, y } = point;

  setImageCropValue(canonicalProp, { x, y });
  modalImage.style.objectPosition = `${x}% ${y}%`;

  if (marker instanceof HTMLElement) {
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
  }

  if (positionNode instanceof HTMLElement) {
    positionNode.textContent = getCropLabel(x, y);
  }

  applyCropToField(canonicalProp);
  notifyFormModified();
}

function resetCrop(modal) {
  if (!(modal instanceof HTMLDialogElement)) return;
  const field = modal.dataset.cropField || '';
  const canonicalProp = normalizeProp(field);
  if (!canonicalProp) return;

  resetImageCropValue(canonicalProp);
  updateModalState(modal, canonicalProp, modal.querySelector(MODAL_IMAGE_SELECTOR));
  notifyFormModified();
}

function closeCropModal(modal) {
  if (modal instanceof HTMLDialogElement && modal.open) {
    modal.close();
  }
}

function initPreviewImageCropper() {
  const modal = document.getElementById(MODAL_ID);
  if (!(modal instanceof HTMLDialogElement)) return;
  if (document.__previewImageCropperBound === 'true') {
    syncAllCropStyles();
    return;
  }

  document.__previewImageCropperBound = 'true';
  syncAllCropStyles();

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const cropTarget = target.closest(PREVIEW_CROP_SELECTOR);
      if (cropTarget instanceof HTMLImageElement) {
        event.preventDefault();
        openCropModal(cropTarget);
      }
    },
    true,
  );

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-crop-close]')) {
      closeCropModal(modal);
      return;
    }

    if (target.closest('[data-crop-reset]')) {
      resetCrop(modal);
      return;
    }

    if (target.closest(MODAL_CANVAS_SELECTOR)) {
      applyCropFromPointer(modal, event);
    }
  });

  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCropModal(modal);
  });

  modal.addEventListener('close', () => {
    const positionNode = modal.querySelector(MODAL_POSITION_SELECTOR);
    if (positionNode instanceof HTMLElement) {
      positionNode.textContent = 'Cliquez sur l’image pour déplacer le cadrage';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreviewImageCropper, {
    once: true,
  });
} else {
  initPreviewImageCropper();
}

document.addEventListener('astro:page-load', initPreviewImageCropper);

export {
  initPreviewImageCropper,
  openCropModal,
  closeCropModal,
  syncAllCropStyles,
};
