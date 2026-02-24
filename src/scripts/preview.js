// État d'exécution pour la prévisualisation live
let previewState = {};

// Accumulation des fichiers galerie sélectionnés par l'utilisateur
let galleryFiles = [];
let galleryDataUrls = [];

import PREVIEW_DEFAULTS from './previewDefaults.js';
import {formatDateRange, escapeHtml, isDataUrl } from '../utils/utilitaires.js';

// raccourcis pour sélectionner des éléments DOM
const selectOne = (selector, context = document) => context.querySelector(selector);

const IMAGE_DESCRIPTION_MAP = {
  hero: 'description_hero',
  photo_partie_1: 'description_photo_partie_1',
  photo_partie_2: 'description_photo_partie_2',
  photo_partie_3: 'description_photo_partie_3',
};

function hasImageValue(prop) {
  const value = previewState[prop];
  return String(value || '').trim() !== '';
}

function syncImageDescriptionVisibility(imageProp) {
  const descriptionProp = IMAGE_DESCRIPTION_MAP[imageProp];
  if (!descriptionProp) return;

  const shouldShowDescription = hasImageValue(imageProp);
  const descriptionNodes = Array.from(document.querySelectorAll(`[data-field="${descriptionProp}"]`));
  descriptionNodes.forEach((descriptionNode) => {
    descriptionNode.style.display = shouldShowDescription ? '' : 'none';
  });
}

function syncAllImageDescriptionVisibility() {
  Object.keys(IMAGE_DESCRIPTION_MAP).forEach(syncImageDescriptionVisibility);
}

function syncImageSectionLayout(imageProp) {
  const hasImage = hasImageValue(imageProp);
  const layoutNodes = Array.from(document.querySelectorAll(`[data-image-layout="${imageProp}"]`));

  layoutNodes.forEach((layoutNode) => {
    layoutNode.style.gridTemplateColumns = hasImage ? '' : '1fr';

    const mediaNodes = Array.from(layoutNode.querySelectorAll(`[data-image-layout-media="${imageProp}"]`));
    mediaNodes.forEach((mediaNode) => {
      mediaNode.style.display = hasImage ? '' : 'none';
    });
  });
}

function syncAllImageSectionLayouts() {
  Object.keys(IMAGE_DESCRIPTION_MAP).forEach(syncImageSectionLayout);
}

// met à jour tous les éléments ayant l'attribut data-field égal à prop
function renderField(prop) {
  const nodes = Array.from(document.querySelectorAll(`[data-field="${prop}"]`));
  const value = previewState[prop];
  if (!nodes.length) {
    if (Object.prototype.hasOwnProperty.call(IMAGE_DESCRIPTION_MAP, prop)) {
      syncImageDescriptionVisibility(prop);
      syncImageSectionLayout(prop);
    }
    return;
  }
  nodes.forEach((element) => {
    if (element.tagName === 'IMG') {
      // image : définir la source et paramètres de chargement
      element.src = value || '';
      element.loading = 'lazy';
      element.decoding = 'async';
      // cacher l'image si pas de src
      element.style.display = value ? '' : 'none';
      if (Object.prototype.hasOwnProperty.call(IMAGE_DESCRIPTION_MAP, prop)) {
        syncImageDescriptionVisibility(prop);
        syncImageSectionLayout(prop);
      }
      return;
    }

    // anchors: mettre à jour le href (ex: lien_lieu)
    if (element.tagName === 'A') {
      try {
        element.href = value || '#';
        // afficher/cacher selon la présence d'un lien explicite
        element.style.display = value ? '' : 'none';
      } catch (err) {}
      return;
    }

    // champs texte multi-lignes stockés avec des sauts de ligne -> paragraphes
    if (prop.startsWith('texte_partie') || prop === 'description_remerciements') {
      element.innerHTML = (String(value || '')).split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
      return;
    }

    // champs de date affichés via la fonction de formatage d'intervalle
    if (prop === 'dates' || prop === 'date_debut' || prop === 'date_fin') {
      const formattedRange = formatDateRange(previewState.date_debut, previewState.date_fin);
      element.textContent = formattedRange;
      return;
    }

    // spécial : afficher le champ `chiffre` avec symbole euro
    if (prop === 'chiffre') {
      const num = Number(value);
      if (Number.isFinite(num)) {
        // valeur numérique formatée + espace insécable + €
        element.textContent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + '\u00A0€';
      } else if (value && String(value).trim() !== '') {
        // valeur non numérique (texte) : afficher la valeur suivie du €
        element.textContent = String(value) + '\u00A0€';
      } else {
        // aucun chiffre : afficher quand même le symbole €
        element.textContent = '\u00A0€';
      }
    } else {
      element.textContent = value ?? '';
    }
  });
}

// rend la galerie principale (élément #photoGrid dans #actionPreview -> le parent de toute ma logique de page dans actions)
function renderGallery(photoUrls) {
  const previewRoot = document.getElementById('actionPreview');
  if (!previewRoot) return;

  const photoGrid = previewRoot.querySelector('#photoGrid');
  if (!photoGrid) return;

  // vider les vignettes précédentes
  photoGrid.innerHTML = '';

  // créer les vignettes
  photoUrls.forEach((photoUrl, index) => {
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'relative w-full h-full overflow-hidden rounded-box cursor-pointer';
    thumbnailDiv.setAttribute('data-photo-index', String(index));
    thumbnailDiv.setAttribute('data-photo-url', photoUrl);

    const thumbnailImage = document.createElement('img');
    thumbnailImage.alt = 'Photo de la galerie';
    thumbnailImage.className = 'absolute inset-0 w-full h-full object-center object-cover';
    thumbnailImage.src = photoUrl;
    thumbnailImage.loading = 'lazy';
    thumbnailImage.decoding = 'async';
    thumbnailDiv.appendChild(thumbnailImage);

    photoGrid.appendChild(thumbnailDiv);
  });
  photoGrid.dataset.photoCount = String(photoUrls.length);

  // attendre que toutes les images aient déclenché load/complete pour appliquer le layout
  const galleryImageElements = photoGrid.querySelectorAll('img');
  let loadedCount = 0;
  const applyAndReveal = () => {
    // si un script externe expose setGridStyles, l'appeler
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      try { window.setGridStyles(); } catch (error) {}
    }

    // bind d'ouverture modal sur clic : on cherche l'élément le plus proche avec data-photo-index
    if (!photoGrid.__previewBound) {
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
    // écouter load/error pour chaque image et invoquer applyAndReveal lorsque toutes sont traitées
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

// synchronise la valeur d'un hidden input avec previewState[prop]
function updateHidden(prop) {
  const hiddenInput = document.getElementById(`hidden_${prop}`);
  if (!hiddenInput) return;
  const value = previewState[prop];
  hiddenInput.value = Array.isArray(value) ? JSON.stringify(value) : (value ?? '');
}

// re-render toutes les miniatures sélectionnées depuis galleryFiles/galleryDataUrls
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
    removeButton.innerHTML = '×';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  // délégation : un seul listener sur le container
  if (!container.__galleryBound) {
    container.addEventListener('click', function (event) {
      const clickedButton = event.target.closest && event.target.closest('[data-gallery-index]');
      if (!clickedButton) return;
      const removeIndex = parseInt(clickedButton.getAttribute('data-gallery-index'), 10);
      if (Number.isNaN(removeIndex)) return;

      // retirer le fichier et sa data URL des tableaux
      galleryFiles.splice(removeIndex, 1);
      galleryDataUrls.splice(removeIndex, 1);

      // reconstruire le DataTransfer pour la soumission
      const fileInput = document.getElementById('input_galerie_photos');
      if (fileInput) {
        const dt = new DataTransfer();
        galleryFiles.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
      }

      // mettre à jour la preview et les miniatures
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

// affiche les miniatures des images déjà présentes côté serveur (avec boutons de suppression)
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
    removeButton.setAttribute('data-photo-url', photoUrl);
    removeButton.innerHTML = '×';
    thumbnailWrap.appendChild(removeButton);

    container.appendChild(thumbnailWrap);
  });

  // clic sur une miniature existante -> marquer comme supprimée
  if (!container.__bound) {
    container.addEventListener('click', function (event) {
      const clickedButton = event.target.closest && event.target.closest('[data-photo-url]');
      if (!clickedButton) return;
      const photoUrl = clickedButton.getAttribute('data-photo-url');
      if (!photoUrl) return;

      const hiddenRemoveInput = document.getElementById('hidden_remove_galerie_photos');
      container.__removed = container.__removed || [];
      container.__removed.push(photoUrl);
      if (hiddenRemoveInput) hiddenRemoveInput.value = JSON.stringify(container.__removed);

      // retirer l'URL du previewState et re-render
      previewState.galerie_photos = (previewState.galerie_photos || []).filter((url) => url !== photoUrl);
      const remainingExisting = (previewState.galerie_photos || []).filter((url) => typeof url === 'string' && !isDataUrl(url));
      renderExistingThumbnails(remainingExisting);
      renderGallery(previewState.galerie_photos || []);
      updateHidden('galerie_photos');
    });
    container.__bound = true;
  }
}

// gère les changements sur les inputs text/select/date etc.
function handleInputElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop');
  if (!prop) return;

  const rawValue = inputElement.value ?? '';
  const isEmpty = String(rawValue).trim() === '';

  // pour l'affichage, si l'input est vide on affiche la valeur par défaut
  const previewValue = isEmpty
    ? (typeof PREVIEW_DEFAULTS !== 'undefined' && PREVIEW_DEFAULTS[prop] !== undefined
        ? PREVIEW_DEFAULTS[prop]
        : (DEFAULT_PLACEHOLDERS[prop] ?? ''))
    : rawValue;

  // mettre à jour l'état d'affichage
  previewState[prop] = previewValue;

  // alias pour les clés utilisées dans le template de preview
  if (prop === 'titre_remerciement') previewState['titre_remerciements'] = previewValue;
  if (prop === 'description_remerciement') previewState['description_remerciements'] = previewValue;

  // hidden inputs doivent contenir LA VALEUR RÉELLE fournie par l'utilisateur (vide si supprimée)
  const hiddenField = document.getElementById(`hidden_${prop}`);
  if (hiddenField) hiddenField.value = rawValue;

  // n'écrire le hidden via updateHidden que si l'utilisateur a saisi une valeur
  if (!isEmpty) updateHidden(prop);

  // rerendre la preview (dates/chiffres/alias gérés)
  if (prop === 'date_debut' || prop === 'date_fin') renderField('dates');
  renderField(prop);
  if (prop === 'titre_remerciement') renderField('titre_remerciements');
  if (prop === 'description_remerciement') renderField('description_remerciements');
}

// gère les inputs de type "file" (galerie multiple ou image unique)
function handleFileElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop-file');
  if (!prop) return;
  const selectedFiles = inputElement.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  // traitement pour la galerie multiple
  if (prop === 'galerie_photos') {
    const existingCount = Array.isArray(previewState.galerie_photos)
      ? previewState.galerie_photos.filter((u) => typeof u === 'string' && !isDataUrl(u)).length
      : 0;
    const remainingSlots = Math.max(0, 8 - existingCount - galleryFiles.length);
    if (remainingSlots === 0) return;

    // ajouter seulement les nouveaux fichiers (dans la limite)
    const newFiles = Array.from(selectedFiles).slice(0, remainingSlots);
    galleryFiles = galleryFiles.concat(newFiles);

    // lire UNIQUEMENT les nouveaux fichiers en data URL, puis les ajouter à galleryDataUrls
    const readPromises = newFiles.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    }));

    Promise.all(readPromises).then((newDataUrls) => {
      galleryDataUrls = galleryDataUrls.concat(newDataUrls);

      // reconstruire le DataTransfer pour la soumission
      const fileInput = document.getElementById('input_galerie_photos');
      if (fileInput) {
        const dt = new DataTransfer();
        galleryFiles.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
      }

      // mettre à jour la preview et les miniatures
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

  // traitement pour une image unique
  const file = selectedFiles[0];

  // s'assurer que input.files contient bien le fichier via DataTransfer (compatibilité soumission)
  try {
    if (inputElement) {
      const fileInput = inputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.__dt = dataTransfer;
      fileInput.files = dataTransfer.files;
      try {
        const formElement = document.getElementById('leftForm');
        if (formElement) {
          const removeElement = document.getElementById(`remove_${prop}`);
          if (removeElement && removeElement.parentElement) removeElement.parentElement.removeChild(removeElement);
        }
      } catch (err) {}
    }
  } catch (err) {}

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target.result;
    previewState[prop] = dataUrl; // stocker la data URL pour l'aperçu
    renderField(prop);

    try { updateHidden(prop); } catch (err) {}
    try { renderFormImagePreview(prop, dataUrl); } catch (err) {}
  };
  reader.readAsDataURL(file);
}

// affiche un aperçu inline pour un champ image unique (preview_{prop})
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

  // add a visible label similar to server-provided previews
  const labelWrap = document.createElement('div');
  labelWrap.className = 'absolute top-2 left-2 z-10';
  const labelP = document.createElement('p');
  labelP.className = 'text-xs text-white bg-black/60 px-2 py-1 rounded';
  labelP.textContent = 'Photo actuelle';
  labelWrap.appendChild(labelP);
  previewWrap.appendChild(labelWrap);

  container.appendChild(previewWrap);

  // suppression de l'aperçu par l'utilisateur : nettoyer input, previewState et hidden
  removeButton.addEventListener('click', function () {
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

// rendre tous les champs à partir du previewState
function renderAll() {
  Object.keys(previewState).forEach((key) => {
    if (key === 'galerie_photos') {
      if (Array.isArray(previewState.galerie_photos) && previewState.galerie_photos.length) renderGallery(previewState.galerie_photos);
      return;
    }
    renderField(key);
  });
  syncAllImageDescriptionVisibility();
  syncAllImageSectionLayouts();
}

// initialisation : récupérer les données placeholder et binder les handlers
function initPreview() {
  const previewRoot = document.getElementById('actionPreview');
  const placeholderScript = selectOne('#previewData');
  const placeholderFromWindow = typeof window !== 'undefined' && (window.__previewData !== undefined) ? window.__previewData : null;
  const placeholder = placeholderFromWindow || (placeholderScript ? JSON.parse(placeholderScript.textContent || '{}') : {});
  previewState = Object.assign({}, placeholder);

  const formElement = document.getElementById('leftForm');

  // initialiser les inputs du formulaire avec les valeurs de previewState
  // Remplir uniquement si la valeur a été fournie côté serveur (mode édition).
  if (formElement) {
    Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
      const prop = fieldElement.getAttribute('data-prop');
      if (!prop || previewState[prop] === undefined || !('value' in fieldElement)) return;
      // n'écrase pas les inputs vides côté création — seuls les champs qui
      // ont un attribut `value` (rendus par le serveur en édition) sont initialisés.
      if (fieldElement.hasAttribute('value')) {
        fieldElement.value = previewState[prop];
      }
    });
  }

  renderAll();

  // remplir les hidden inputs initiaux (sauf galerie)
  // N'écrit les `hidden_*` qu'en mode édition (le serveur pré-remplit `value`),
  // sinon on garde les hidden vides pour ne pas envoyer les placeholders au POST.
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
    if (existing.length) renderExistingThumbnails(existing);
  }

  // binder les écouteurs sur le formulaire
  if (formElement) {
    Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
      const eventName = fieldElement.tagName === 'SELECT' || fieldElement.type === 'date' ? 'change' : 'input';
      fieldElement.addEventListener(eventName, (event) => {
        handleInputElement(event.currentTarget);
      });
    });
    Array.from(formElement.querySelectorAll('[data-prop-file]')).forEach((fileInput) => {
      fileInput.addEventListener('change', (event) => {
        handleFileElement(event.currentTarget);
      });
    });

    // avant soumission : synchroniser tous les hidden_* et la galerie
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

// bind global pour les boutons de suppression d'images existantes
function bindExistingSingleRemoveButtons() {
  if (document.__existingRemoveBound) return;
  document.addEventListener('click', function (event) {
    const removeButton = event.target && event.target.closest ? event.target.closest('.existing-single-remove') : null;
    if (!removeButton) return;

    const prop = removeButton.getAttribute('data-prop');
    if (!prop) return;
    const formElement = document.getElementById('leftForm');

    // créer ou mettre à jour un hidden remove_{prop} pour indiquer la suppression côté serveur
    if (formElement) {
      let hiddenRemoveInput = document.getElementById(`remove_${prop}`);
      if (!hiddenRemoveInput) {
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

    // masquer le container existant pour que l'utilisateur voie la suppression
    const container = removeButton.closest && removeButton.closest('[id^="existing_"]') ? removeButton.closest('[id^="existing_"]') : removeButton.parentElement && removeButton.parentElement.parentElement;
    if (container) {
      try {
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

// exposer initPreview pour usage manuel/debug si disponible
try {
  if (typeof window !== 'undefined') {
    window.__initPreview = initPreview;
  }
} catch (e) {}

// démarrer automatiquement si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreview);
} else {
  initPreview();
}

