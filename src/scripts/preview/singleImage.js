import { isDataUrl } from '../../utils/utilitaires.js';
import { previewState } from './state.js';
import { renderField } from './render.js';
import { updateHidden } from './init.js';
import {
  optimizeFileListForField,
  WEBP_PREOPTIMIZED_ATTR,
} from '../actionForm/convertToWebp.js';

const WEBP_BG_TOKEN_ATTR = 'data-webp-bg-token';
const OPTIMIZE_OVERLAY_ATTR = 'data-optimize-overlay';
const OPTIMIZE_FILL_ATTR = 'data-optimize-fill';
const OPTIMIZE_LABEL_ATTR = 'data-optimize-label';

function createAsyncToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function updateSinglePreviewOptimization(prop, percent, isActive) {
  const container = document.getElementById(`preview_${prop}`);
  if (!container) return;

  const overlay = container.querySelector(`[${OPTIMIZE_OVERLAY_ATTR}="true"]`);
  if (!(overlay instanceof HTMLElement)) return;

  const fill = overlay.querySelector(`[${OPTIMIZE_FILL_ATTR}="true"]`);
  const label = overlay.querySelector(`[${OPTIMIZE_LABEL_ATTR}="true"]`);
  if (!(fill instanceof HTMLElement) || !(label instanceof HTMLElement)) return;

  const safePercent = clampPercent(percent);
  fill.style.height = `${safePercent}%`;
  label.textContent = `${safePercent}%`;
  overlay.classList.toggle('hidden', !isActive);
}

function createSinglePreviewOptimizationOverlay() {
  const overlay = document.createElement('div');
  overlay.setAttribute(OPTIMIZE_OVERLAY_ATTR, 'true');
  overlay.className = 'absolute inset-0 hidden pointer-events-none z-[5]';

  const fill = document.createElement('div');
  fill.setAttribute(OPTIMIZE_FILL_ATTR, 'true');
  fill.className = 'absolute inset-x-0 bottom-0 bg-black/50 transition-[height] duration-200 ease-linear';
  fill.style.height = '0%';

  const label = document.createElement('p');
  label.setAttribute(OPTIMIZE_LABEL_ATTR, 'true');
  label.className = 'absolute inset-0 flex items-center justify-center text-sm font-semibold text-white drop-shadow';
  label.textContent = '0%';

  overlay.appendChild(fill);
  overlay.appendChild(label);
  return overlay;
}

function handleFileElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop-file');
  if (!prop || prop === 'galerie_photos') return;
  const selectedFiles = inputElement.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  const file = selectedFiles[0];
  inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'false');

  try {
    if (inputElement) {
      const fileInput = inputElement;
      const dataTransfer = new DataTransfer();
      // DataTransfer permet de garder une liste de fichiers cohérente après remplacements/suppressions.
      dataTransfer.items.add(file);
      fileInput.__dt = dataTransfer;
      fileInput.files = dataTransfer.files;
      try {
        const formElement = document.getElementById('leftForm');
        if (formElement) {
          // Si l'utilisateur remet une image, on retire un éventuel indicateur de suppression.
          const removeElement = document.getElementById(`remove_${prop}`);
          if (removeElement && removeElement.parentElement) removeElement.parentElement.removeChild(removeElement);
        }
      } catch (err) {}
    }
  } catch (err) {}

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target.result;
    previewState[prop] = dataUrl;
    renderField(prop);

    try { updateHidden(prop); } catch (err) {}
    try { renderFormImagePreview(prop, dataUrl); } catch (err) {}
  };
  reader.readAsDataURL(file);

  // Compression silencieuse en arriere-plan au moment de l'ajout.
  const asyncToken = createAsyncToken();
  inputElement.setAttribute(WEBP_BG_TOKEN_ATTR, asyncToken);
  updateSinglePreviewOptimization(prop, 0, true);
  void optimizeFileListForField([file], prop, undefined, (_, percent) => {
    if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
    updateSinglePreviewOptimization(prop, percent, true);
  }).then((optimizedFiles) => {
    if (!Array.isArray(optimizedFiles) || optimizedFiles.length === 0) return;
    if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;

    const optimizedFile = optimizedFiles[0];
    if (!(optimizedFile instanceof File)) return;

    // Meme sans changement de taille, la passe est terminee pour ce champ.
    if (optimizedFile === file) {
      inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'true');
      updateSinglePreviewOptimization(prop, 100, false);
      return;
    }

    const currentFiles = inputElement.files;
    if (!currentFiles || currentFiles.length === 0) return;

    const dt = new DataTransfer();
    dt.items.add(optimizedFile);
    inputElement.__dt = dt;
    inputElement.files = dt.files;
    inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'true');
    updateSinglePreviewOptimization(prop, 100, false);
  }).catch(() => {
    updateSinglePreviewOptimization(prop, 100, false);
  });
}

function renderFormImagePreview(prop, dataUrl) {
  const container = document.getElementById(`preview_${prop}`);
  if (!container) return;

  container.innerHTML = '';
  if (!dataUrl || !isDataUrl(dataUrl)) return;

  const previewWrap = document.createElement('div');
  previewWrap.className = 'relative w-full overflow-hidden rounded-md';
  previewWrap.style.paddingBottom = '56%';

  const previewImage = document.createElement('img');
  previewImage.src = dataUrl;
  previewImage.alt = 'Aperçu';
  previewImage.className = 'absolute inset-0 w-full h-full object-cover';
  previewWrap.appendChild(previewImage);
  previewWrap.appendChild(createSinglePreviewOptimizationOverlay());

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center z-10';
  removeButton.textContent = '\u2716';
  previewWrap.appendChild(removeButton);

  const labelWrap = document.createElement('div');
  labelWrap.className = 'absolute top-2 left-2 z-10';
  const labelP = document.createElement('p');
  labelP.className = 'text-xs text-white bg-black/60 px-2 py-1 rounded';
  labelP.textContent = 'Photo actuelle';
  labelWrap.appendChild(labelP);
  previewWrap.appendChild(labelWrap);

  container.appendChild(previewWrap);

  removeButton.addEventListener('click', function () {
    // Clic de suppression local : on nettoie le champ fichier, l'état de prévisualisation et le champ caché.
    const fileInput = document.querySelector(`[data-prop-file="${prop}"]`);
    if (fileInput) {
      try {
        fileInput.value = '';
        fileInput.removeAttribute(WEBP_BG_TOKEN_ATTR);
        fileInput.removeAttribute(WEBP_PREOPTIMIZED_ATTR);
        if (fileInput.__dt) {
          fileInput.__dt = new DataTransfer();
          fileInput.files = fileInput.__dt.files;
        }
      } catch (err) {}
    }
    previewState[prop] = '';
    renderField(prop);
    updateHidden(prop);
    container.innerHTML = '';
  });
}

function bindExistingSingleRemoveButtons() {
  if (document.__existingRemoveBound) return;
  document.addEventListener('click', function (event) {
    const removeButton = event.target && event.target.closest ? event.target.closest('.existing-single-remove') : null;
    if (!removeButton) return;

    const prop = removeButton.getAttribute('data-prop');
    if (!prop) return;
    const formElement = document.getElementById('leftForm');

    if (formElement) {
      let hiddenRemoveInput = document.getElementById(`remove_${prop}`);
      if (!hiddenRemoveInput) {
        // Ce champ caché est lu côté serveur pour supprimer le fichier existant.
        hiddenRemoveInput = document.createElement('input');
        hiddenRemoveInput.type = 'hidden';
        hiddenRemoveInput.id = `remove_${prop}`;
        hiddenRemoveInput.name = `remove_${prop}`;
        hiddenRemoveInput.value = '1';
        formElement.appendChild(hiddenRemoveInput);
      } else {
        hiddenRemoveInput.value = '1';
      }
    }

    const container = removeButton.closest && removeButton.closest('[id^="existing_"]') ? removeButton.closest('[id^="existing_"]') : removeButton.parentElement && removeButton.parentElement.parentElement;
    if (container) {
      try {
        // On masque le bloc plutôt que remove() pour préserver la structure du DOM existante.
        container.style.display = 'none';
        container.__hiddenByPreview = true;
      } catch (err) {
        try { if (container.remove) container.remove(); } catch (err2) {}
      }
    }

    previewState[prop] = '';
    renderField(prop);

    if (formElement) {
      let hiddenField = document.getElementById(`hidden_${prop}`);
      if (!hiddenField) {
        hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.id = `hidden_${prop}`;
        hiddenField.name = prop;
        formElement.appendChild(hiddenField);
      }
      hiddenField.value = '';
    }
    updateHidden(prop);
  });
  document.__existingRemoveBound = true;
}

export { handleFileElement, renderFormImagePreview, bindExistingSingleRemoveButtons };

