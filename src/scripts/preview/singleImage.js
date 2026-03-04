import { isDataUrl } from '../../utils/utilitaires.js';
import { previewState } from './state.js';
import { renderField } from './render.js';
import { updateHidden } from './init.js';

function handleFileElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop-file');
  if (!prop || prop === 'galerie_photos') return;
  const selectedFiles = inputElement.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  const file = selectedFiles[0];

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

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
  removeButton.innerHTML = '×';
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
