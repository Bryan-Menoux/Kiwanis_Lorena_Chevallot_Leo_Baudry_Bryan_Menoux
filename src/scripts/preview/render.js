import { formatDateRange, escapeHtml } from '../../utils/utilitaires.js';
import {
  IMAGE_DESCRIPTION_MAP,
  getDerivedState,
  normalizeProp,
} from './state.js';
import {
  hasImageValue,
  syncAllImageDescriptionVisibility,
  syncAllImageSectionLayouts,
  syncImageDescriptionVisibility,
  syncImageSectionLayout,
  syncLocationCardsVisibility,
  syncPartSectionsVisibility,
  syncThanksSectionVisibility,
} from './renderVisibility.js';
import {
  renderExistingThumbnails,
  renderFormGalleryThumbnails,
  renderGallery,
  renderGalleryThumbnailOptimizationProgress,
  applyPreviewCropStyle,
  renderSingleImageOptimizationProgress,
  renderSingleImagePreview,
} from './renderMedia.js';

function renderField(prop) {
  const canonicalProp = normalizeProp(prop);
  const derived = getDerivedState();
  const value = derived.values[canonicalProp];
  const nodes = Array.from(document.querySelectorAll(`[data-field="${canonicalProp}"]`));

  if (!nodes.length) {
    if (Object.prototype.hasOwnProperty.call(IMAGE_DESCRIPTION_MAP, canonicalProp)) {
      syncImageDescriptionVisibility(canonicalProp);
      syncImageSectionLayout(canonicalProp);
    }
    if (canonicalProp === 'galerie_photos') {
      renderGallery(derived.galleryPreviewUrls);
    }
    return;
  }

  nodes.forEach((element) => {
    if (element.tagName === 'IMG') {
      element.src = value || '';
      element.loading = 'lazy';
      element.decoding = 'async';
      element.style.display = value ? '' : 'none';
      applyPreviewCropStyle(element, canonicalProp);
      if (Object.prototype.hasOwnProperty.call(IMAGE_DESCRIPTION_MAP, canonicalProp)) {
        syncImageDescriptionVisibility(canonicalProp);
        syncImageSectionLayout(canonicalProp);
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

    if (canonicalProp.startsWith('texte_partie') || canonicalProp === 'description_remerciements') {
      element.innerHTML = String(value || '')
        .split('\n')
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('');
      return;
    }

    if (canonicalProp === 'dates') {
      const formattedRange = formatDateRange(derived.values.date_debut, derived.values.date_fin);
      element.textContent = formattedRange;
      return;
    }

    if (canonicalProp === 'date_debut' || canonicalProp === 'date_fin') {
      const formattedRange = formatDateRange(derived.values.date_debut, derived.values.date_fin);
      const dateRangeNodes = Array.from(document.querySelectorAll('[data-field="dates"]'));
      dateRangeNodes.forEach((dateRangeNode) => {
        dateRangeNode.textContent = formattedRange;
      });
      return;
    }

    if (canonicalProp === 'chiffre') {
      const num = Number(value);
      if (Number.isFinite(num)) {
        element.textContent =
          `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num)} €`;
      } else if (value && String(value).trim() !== '') {
        element.textContent = `${String(value)} €`;
      } else {
        element.textContent = ' €';
      }
      return;
    }

    if (canonicalProp === 'type_de_chiffre') {
      const v = String(value || '').trim();
      const chiffreNum = Number(derived.values.chiffre);
      const chiffreIsNegative = Number.isFinite(chiffreNum) && chiffreNum < 0;
      const label = v && v !== 'type de chiffre' ? v : (chiffreIsNegative ? 'chiffre clé' : '');
      element.textContent = label;
      element.style.display = label ? '' : 'none';
      return;
    }

    element.textContent = value ?? '';
  });

  if (
    canonicalProp === 'nom_lieu' ||
    canonicalProp === 'adresse_lieu' ||
    canonicalProp === 'chiffre' ||
    canonicalProp === 'type_de_chiffre' ||
    canonicalProp === 'beneficiaire'
  ) {
    syncLocationCardsVisibility();
  }

  if (
    canonicalProp === 'texte_partie_1' ||
    canonicalProp === 'photo_partie_1' ||
    canonicalProp === 'description_photo_partie_1' ||
    canonicalProp === 'texte_partie_2' ||
    canonicalProp === 'photo_partie_2' ||
    canonicalProp === 'description_photo_partie_2' ||
    canonicalProp === 'texte_partie_3' ||
    canonicalProp === 'photo_partie_3' ||
    canonicalProp === 'description_photo_partie_3'
  ) {
    syncPartSectionsVisibility();
  }

  if (canonicalProp === 'description_remerciements') {
    syncThanksSectionVisibility();
  }
}

function renderAll() {
  const derived = getDerivedState();

  Object.keys(derived.values).forEach((key) => {
    if (key === 'galerie_photos') return;
    renderField(key);
  });

  renderGallery(derived.galleryPreviewUrls);
  renderExistingThumbnails();
  renderFormGalleryThumbnails();

  Object.keys(IMAGE_DESCRIPTION_MAP).forEach((prop) => {
    renderSingleImagePreview(prop);
  });

  syncAllImageDescriptionVisibility();
  syncAllImageSectionLayouts();
  syncLocationCardsVisibility();
  syncPartSectionsVisibility();
  syncThanksSectionVisibility();
}

export {
  IMAGE_DESCRIPTION_MAP,
  hasImageValue,
  syncImageDescriptionVisibility,
  syncAllImageDescriptionVisibility,
  syncImageSectionLayout,
  syncAllImageSectionLayouts,
  syncPartSectionsVisibility,
  syncThanksSectionVisibility,
  syncLocationCardsVisibility,
  renderField,
  renderAll,
  renderGallery,
  renderFormGalleryThumbnails,
  renderExistingThumbnails,
  renderGalleryThumbnailOptimizationProgress,
  renderSingleImagePreview,
  renderSingleImageOptimizationProgress,
};
