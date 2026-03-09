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
import { optimizeFileListForField } from '../actionForm/convertToWebp.js';

const selectOne = (selector, context = document) => context.querySelector(selector);
const NO_DEFAULT_FALLBACK_PROPS = new Set([
  'nom_lieu',
  'adresse_lieu',
  'lien_lieu',
  'chiffre',
  'type_de_chiffre',
  'beneficiaire',
]);

// Certains champs (lieu/chiffres) ne doivent jamais retomber sur un placeholder visuel.
function getPreviewFallbackValue(prop) {
  if (NO_DEFAULT_FALLBACK_PROPS.has(prop)) return '';
  return Object.prototype.hasOwnProperty.call(PREVIEW_DEFAULTS, prop)
    ? PREVIEW_DEFAULTS[prop]
    : '';
}

function safeParseJson(rawValue, fallbackValue = {}) {
  if (!rawValue || typeof rawValue !== 'string') return fallbackValue;
  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

// Source de vérité initiale de la prévisualisation :
// 1) window.__previewData injecté côté serveur
// 2) script #previewData (repli historique)
// 3) objet vide si rien n'est disponible
function readPlaceholderData(placeholderScript) {
  const fromWindow = typeof window !== 'undefined' ? window.__previewData : undefined;
  if (fromWindow && typeof fromWindow === 'object') return fromWindow;
  if (typeof fromWindow === 'string') return safeParseJson(fromWindow, {});
  if (placeholderScript) return safeParseJson(placeholderScript.textContent || '{}', {});
  return {};
}

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

  const isMultiSelect = inputElement instanceof HTMLSelectElement && inputElement.multiple;
  const maxSelect = isMultiSelect
    ? Number.parseInt(inputElement.dataset.maxSelect || '', 10)
    : NaN;
  const maxAllowed = Number.isFinite(maxSelect) && maxSelect > 0 ? maxSelect : Infinity;
  const rawValue = isMultiSelect
    ? Array.from(inputElement.selectedOptions)
      .map((option) => option.value)
      .filter((value) => String(value).trim() !== '')
    : (inputElement.value ?? '');

  // Limite de sécurité sur le multi-select "type_action".
  if (isMultiSelect && prop === 'type_action' && rawValue.length > maxAllowed) {
    const keptValues = rawValue.slice(0, maxAllowed);
    const keptSet = new Set(keptValues);
    Array.from(inputElement.options).forEach((option) => {
      option.selected = keptSet.has(option.value);
    });
    rawValue.length = 0;
    keptValues.forEach((value) => rawValue.push(value));
  }
  const isEmpty = isMultiSelect
    ? rawValue.length === 0
    : String(rawValue).trim() === '';

  const previewValue = isMultiSelect
    ? rawValue
    : (isEmpty
      ? getPreviewFallbackValue(prop)
      : rawValue);

  previewState[prop] = previewValue;

  // Compat : les clés historiques sans "s" sont remappées vers les clés de prévisualisation actuelles.
  if (prop === 'titre_remerciement') previewState.titre_remerciements = previewValue;
  if (prop === 'description_remerciement') previewState.description_remerciements = previewValue;

  const hiddenField = document.getElementById(`hidden_${prop}`);
  if (hiddenField) hiddenField.value = isMultiSelect ? JSON.stringify(rawValue) : rawValue;

  if (isMultiSelect || !isEmpty) updateHidden(prop);

  if (prop === 'date_debut' || prop === 'date_fin') renderField('dates');
  renderField(prop);
  if (prop === 'titre_remerciement') renderField('titre_remerciements');
  if (prop === 'description_remerciement') renderField('description_remerciements');
}

function initPreview() {
  const previewRoot = document.getElementById('actionPreview');
  const placeholderScript = selectOne('#previewData');
  const placeholder = readPlaceholderData(placeholderScript);
  setPreviewState(Object.assign({}, placeholder));

  const formElement = document.getElementById('leftForm');

  if (formElement) {
    Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
      const prop = fieldElement.getAttribute('data-prop');
      if (!prop || previewState[prop] === undefined || !('value' in fieldElement)) return;
      if (fieldElement instanceof HTMLSelectElement && fieldElement.multiple && Array.isArray(previewState[prop])) {
        const selectedValues = new Set(previewState[prop].map((v) => String(v)));
        Array.from(fieldElement.options).forEach((option) => {
          option.selected = selectedValues.has(option.value);
        });
        return;
      }
      if (fieldElement.hasAttribute('value')) {
        fieldElement.value = previewState[prop];
      }
    });
  }

  renderAll();

  if (formElement) {
    // Au chargement, on recopie l'état courant vers les hidden inputs du formulaire.
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
    const typeActionSelect = formElement.querySelector('#input_type_action[data-prop="type_action"][multiple]');
    if (typeActionSelect instanceof HTMLSelectElement && !typeActionSelect.__toggleBound) {
      // Interaction spécifique: cliquer une option la bascule sans fermer la liste native immédiatement.
      typeActionSelect.addEventListener('mousedown', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLOptionElement)) return;
        event.preventDefault();

        const maxSelect = Number.parseInt(typeActionSelect.dataset.maxSelect || '', 10);
        const maxAllowed = Number.isFinite(maxSelect) && maxSelect > 0 ? maxSelect : Infinity;
        const selectedCount = Array.from(typeActionSelect.selectedOptions).length;

        if (target.selected) {
          target.selected = false;
        } else if (selectedCount < maxAllowed) {
          target.selected = true;
        }

        typeActionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      typeActionSelect.__toggleBound = true;
    }

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
          // La galerie est plafonnée à 8 images (existantes + nouvelles).
          const existingCount = Array.isArray(previewState.galerie_photos)
            ? previewState.galerie_photos.filter((u) => typeof u === 'string' && !isDataUrl(u)).length
            : 0;
          const remainingSlots = Math.max(0, 8 - existingCount - galleryFiles.length);
          if (remainingSlots === 0) return;

          const newFiles = Array.from(selectedFiles).slice(0, remainingSlots);
          setGalleryFiles(galleryFiles.concat(newFiles));
          // Compression silencieuse de la derniere selection en arriere-plan.
          // La previsualisation utilise les originaux immediatement, puis la liste
          // de fichiers du formulaire est remplacee par la version optimisee.
          void optimizeFileListForField(newFiles, prop).then((optimizedFiles) => {
            if (!Array.isArray(optimizedFiles) || optimizedFiles.length === 0) return;

            const replacementMap = new Map();
            newFiles.forEach((originalFile, index) => {
              const optimizedFile = optimizedFiles[index];
              if (!(optimizedFile instanceof File) || optimizedFile === originalFile) return;
              replacementMap.set(originalFile, optimizedFile);
            });
            if (replacementMap.size === 0) return;

            const updatedGalleryFiles = galleryFiles.map((existingFile) =>
              replacementMap.get(existingFile) || existingFile,
            );
            setGalleryFiles(updatedGalleryFiles);

            const fileInputElement = document.getElementById('input_galerie_photos');
            if (fileInputElement) {
              const dt = new DataTransfer();
              updatedGalleryFiles.forEach((f) => dt.items.add(f));
              fileInputElement.files = dt.files;
            }
          }).catch(() => {});

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
      // Dernière synchronisation defensive avant envoi serveur.
      Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
        const prop = fieldElement.getAttribute('data-prop');
        if (!prop) return;
        const hiddenField = document.getElementById(`hidden_${prop}`);
        if (hiddenField) {
          if (fieldElement instanceof HTMLSelectElement && fieldElement.multiple) {
            const selected = Array.from(fieldElement.selectedOptions)
              .map((option) => option.value)
              .filter((value) => String(value).trim() !== '');
            hiddenField.value = JSON.stringify(selected);
          } else {
            hiddenField.value = fieldElement.value ?? '';
          }
        }
      });

      updateHidden('galerie_photos');
    });
  }
}

try {
  if (typeof window !== 'undefined') {
    // Point d'entrée manuel utile pour les tests depuis la console.
    window.__initPreview = initPreview;
  }
} catch (e) {}

export { initPreview, handleInputElement, updateHidden };
