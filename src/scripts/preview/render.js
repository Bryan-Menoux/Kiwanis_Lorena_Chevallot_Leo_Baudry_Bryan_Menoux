import { formatDateRange, escapeHtml, isDataUrl } from '../../utils/utilitaires.js';
import { previewState } from './state.js';
import { renderGallery } from './gallery.js';

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
      element.src = value || '';
      element.loading = 'lazy';
      element.decoding = 'async';
      element.style.display = value ? '' : 'none';
      if (Object.prototype.hasOwnProperty.call(IMAGE_DESCRIPTION_MAP, prop)) {
        syncImageDescriptionVisibility(prop);
        syncImageSectionLayout(prop);
      }
      return;
    }

    if (element.tagName === 'A') {
      try {
        element.href = value || '#';
        element.style.display = value ? '' : 'none';
      } catch (err) {}
      return;
    }

    if (prop.startsWith('texte_partie') || prop === 'description_remerciements') {
      element.innerHTML = (String(value || '')).split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
      return;
    }

    if (prop === 'dates' || prop === 'date_debut' || prop === 'date_fin') {
      const formattedRange = formatDateRange(previewState.date_debut, previewState.date_fin);
      element.textContent = formattedRange;
      return;
    }

    if (prop === 'chiffre') {
      const num = Number(value);
      if (Number.isFinite(num)) {
        element.textContent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + '\u00A0€';
      } else if (value && String(value).trim() !== '') {
        element.textContent = String(value) + '\u00A0€';
      } else {
        element.textContent = '\u00A0€';
      }
    } else {
      element.textContent = value ?? '';
    }
  });
}

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

export {
  IMAGE_DESCRIPTION_MAP,
  hasImageValue,
  syncImageDescriptionVisibility,
  syncAllImageDescriptionVisibility,
  syncImageSectionLayout,
  syncAllImageSectionLayouts,
  renderField,
  renderAll,
};
