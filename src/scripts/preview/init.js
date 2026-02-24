import PREVIEW_DEFAULTS from '../previewDefaults.js';
import { isDataUrl } from '../../utils/utilitaires.js';
import {
  previewState,
  galleryFiles,
  galleryDataUrls,
  setPreviewState,
  setGalleryFiles,
  setGalleryDataUrls,
} from './state.js';
import { renderAll, renderField } from './render.js';
import { handleFileElement, bindExistingSingleRemoveButtons } from './singleImage.js';
import { renderGallery, renderFormGalleryThumbnails, renderExistingThumbnails } from './gallery.js';

const selectOne = (selector, context = document) => context.querySelector(selector);

function updateHidden(prop) {
  const hiddenInput = document.getElementById(`hidden_${prop}`);
  if (!hiddenInput) return;
  const value = previewState[prop];
  hiddenInput.value = Array.isArray(value) ? JSON.stringify(value) : (value ?? '');
}

function handleInputElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop');
  if (!prop) return;

  const rawValue = inputElement.value ?? '';
  const isEmpty = String(rawValue).trim() === '';

  const previewValue = isEmpty
    ? (typeof PREVIEW_DEFAULTS !== 'undefined' && PREVIEW_DEFAULTS[prop] !== undefined
        ? PREVIEW_DEFAULTS[prop]
        : (DEFAULT_PLACEHOLDERS[prop] ?? ''))
    : rawValue;

  previewState[prop] = previewValue;

  if (prop === 'titre_remerciement') previewState.titre_remerciements = previewValue;
  if (prop === 'description_remerciement') previewState.description_remerciements = previewValue;

  const hiddenField = document.getElementById(`hidden_${prop}`);
  if (hiddenField) hiddenField.value = rawValue;

  if (!isEmpty) updateHidden(prop);

  if (prop === 'date_debut' || prop === 'date_fin') renderField('dates');
  renderField(prop);
  if (prop === 'titre_remerciement') renderField('titre_remerciements');
  if (prop === 'description_remerciement') renderField('description_remerciements');
}

function initPreview() {
  const previewRoot = document.getElementById('actionPreview');
  const placeholderScript = selectOne('#previewData');
  const placeholderFromWindow = typeof window !== 'undefined' && (window.__previewData !== undefined) ? window.__previewData : null;
  const placeholder = placeholderFromWindow || (placeholderScript ? JSON.parse(placeholderScript.textContent || '{}') : {});
  setPreviewState(Object.assign({}, placeholder));

  const formElement = document.getElementById('leftForm');

  if (formElement) {
    Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
      const prop = fieldElement.getAttribute('data-prop');
      if (!prop || previewState[prop] === undefined || !('value' in fieldElement)) return;
      if (fieldElement.hasAttribute('value')) {
        fieldElement.value = previewState[prop];
      }
    });
  }

  renderAll();

  if (formElement) {
    Object.keys(previewState).forEach((key) => {
      if (key === 'galerie_photos') return;
      const hiddenElement = document.getElementById(`hidden_${key}`);
      if (hiddenElement && hiddenElement.hasAttribute('value')) {
        updateHidden(key);
      }
    });

    const hiddenGalleryInput = document.getElementById('hidden_galerie_photos');
    if (hiddenGalleryInput) hiddenGalleryInput.value = '';
    const existing = Array.isArray(previewState.galerie_photos) ? previewState.galerie_photos.filter(urlValue => typeof urlValue === 'string' && !isDataUrl(urlValue)) : [];
    renderGallery(existing);
    if (existing.length) renderExistingThumbnails(existing);
  }

  if (formElement) {
    Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
      const eventName = fieldElement.tagName === 'SELECT' || fieldElement.type === 'date' ? 'change' : 'input';
      fieldElement.addEventListener(eventName, (event) => {
        handleInputElement(event.currentTarget);
      });
    });
    Array.from(formElement.querySelectorAll('[data-prop-file]')).forEach((fileInput) => {
      fileInput.addEventListener('change', (event) => {
        const inputElement = event.currentTarget;
        if (!inputElement) return;
        const prop = inputElement.getAttribute('data-prop-file');
        if (!prop) return;
        const selectedFiles = inputElement.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        if (prop === 'galerie_photos') {
          const existingCount = Array.isArray(previewState.galerie_photos)
            ? previewState.galerie_photos.filter((u) => typeof u === 'string' && !isDataUrl(u)).length
            : 0;
          const remainingSlots = Math.max(0, 8 - existingCount - galleryFiles.length);
          if (remainingSlots === 0) return;

          const newFiles = Array.from(selectedFiles).slice(0, remainingSlots);
          setGalleryFiles(galleryFiles.concat(newFiles));

          const readPromises = newFiles.map((file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          }));

          Promise.all(readPromises).then((newDataUrls) => {
            setGalleryDataUrls(galleryDataUrls.concat(newDataUrls));

            const fileInputElement = document.getElementById('input_galerie_photos');
            if (fileInputElement) {
              const dt = new DataTransfer();
              galleryFiles.forEach((f) => dt.items.add(f));
              fileInputElement.files = dt.files;
            }

            const serverUrls = Array.isArray(previewState.galerie_photos)
              ? previewState.galerie_photos.filter((u) => typeof u === 'string' && !isDataUrl(u))
              : [];
            previewState.galerie_photos = serverUrls.concat(galleryDataUrls);
            renderGallery(previewState.galerie_photos);
            updateHidden('galerie_photos');
            renderFormGalleryThumbnails();
          });

          return;
        }

        handleFileElement(inputElement);
      });
    });

    formElement.addEventListener('submit', () => {
      Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
        const prop = fieldElement.getAttribute('data-prop');
        if (!prop) return;
        const hiddenField = document.getElementById(`hidden_${prop}`);
        if (hiddenField) {
          hiddenField.value = fieldElement.value ?? '';
        }
      });

      updateHidden('galerie_photos');
    });
  }
}

try {
  if (typeof window !== 'undefined') {
    window.__initPreview = initPreview;
  }
} catch (e) {}

export { initPreview, handleInputElement, updateHidden };
