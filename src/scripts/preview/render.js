import { formatDateRange, escapeHtml, isDataUrl } from '../../utils/utilitaires.js';
import { previewState } from './state.js';
import { renderGallery } from './gallery.js';

const IMAGE_DESCRIPTION_MAP = {
  hero: 'description_hero',
  photo_partie_1: 'description_photo_partie_1',
  photo_partie_2: 'description_photo_partie_2',
  photo_partie_3: 'description_photo_partie_3',
};

// Vérifie qu'un champ image contient une valeur exploitable.
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
    // Sans image, on force un layout texte pleine largeur.
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

function syncPartSectionsVisibility() {
  const part1Nodes = Array.from(document.querySelectorAll('[data-part-section="1"]'));
  const part2Nodes = Array.from(document.querySelectorAll('[data-part-section="2"]'));
  const part3Nodes = Array.from(document.querySelectorAll('[data-part-section="3"]'));

  const showPart1 = hasNonEmptyValue(previewState.texte_partie_1);
  const showPart2 = hasNonEmptyValue(previewState.texte_partie_2);
  const showPart3 = hasNonEmptyValue(previewState.texte_partie_3);

  part1Nodes.forEach((node) => {
    node.style.display = showPart1 ? '' : 'none';
  });
  part2Nodes.forEach((node) => {
    node.style.display = showPart2 ? '' : 'none';
  });
  part3Nodes.forEach((node) => {
    node.style.display = showPart3 ? '' : 'none';
  });
}

function syncThanksSectionVisibility() {
  const thanksNodes = Array.from(document.querySelectorAll('[data-thanks-section]'));
  if (!thanksNodes.length) return;
  const showThanks = hasNonEmptyValue(previewState.description_remerciements);
  thanksNodes.forEach((node) => {
    node.style.display = showThanks ? '' : 'none';
  });
}

function hasNonEmptyValue(value) {
  return String(value ?? '').trim() !== '';
}

function hasChiffreValue(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim() !== '';
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function hasTypeDeChiffreValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized !== '' && normalized !== 'type de chiffre';
}

function syncLocationSectionLayout(sectionNode) {
  if (!(sectionNode instanceof HTMLElement)) return;

  const cards = Array.from(sectionNode.querySelectorAll('[data-location-card]')).filter(
    (card) => card instanceof HTMLElement,
  );
  if (!cards.length) return;

  cards.forEach((card) => {
    card.classList.remove('md:col-span-2', 'lg:col-span-1');
  });
}

function syncLocationCardsVisibility() {
  const sectionNodes = Array.from(document.querySelectorAll('[data-location-section]'));
  if (!sectionNodes.length) return;

  const hasLieu =
    hasNonEmptyValue(previewState.nom_lieu) || hasNonEmptyValue(previewState.adresse_lieu);
  const chiffreRaw = previewState.chiffre;
  // Règle métier : "0" ne déclenche pas la carte chiffre.
  const chiffreIsZero =
    chiffreRaw === 0 || (typeof chiffreRaw === 'string' && chiffreRaw.trim() === '0');
  const hasChiffre = chiffreIsZero
    ? false
    : hasChiffreValue(chiffreRaw);
  const hasBeneficiaire = hasNonEmptyValue(previewState.beneficiaire);
  const hasAny = hasLieu || hasChiffre || hasBeneficiaire;

  sectionNodes.forEach((sectionNode) => {
    sectionNode.style.display = hasAny ? '' : 'none';

    const lieuCard = sectionNode.querySelector('[data-location-card="lieu"]');
    const chiffreCard = sectionNode.querySelector('[data-location-card="chiffre"]');
    const beneficiaireCard = sectionNode.querySelector('[data-location-card="beneficiaire"]');

    if (lieuCard) lieuCard.style.display = hasLieu ? '' : 'none';
    if (chiffreCard) chiffreCard.style.display = hasChiffre ? '' : 'none';
    if (beneficiaireCard) beneficiaireCard.style.display = hasBeneficiaire ? '' : 'none';
    syncLocationSectionLayout(sectionNode);
  });

  const nomLieuNodes = Array.from(document.querySelectorAll('[data-field="nom_lieu"]'));
  const adresseLieuNodes = Array.from(document.querySelectorAll('[data-field="adresse_lieu"]'));
  const showNomLieu = hasNonEmptyValue(previewState.nom_lieu);
  const showAdresseLieu = hasNonEmptyValue(previewState.adresse_lieu);

  nomLieuNodes.forEach((node) => {
    node.style.display = showNomLieu ? '' : 'none';
  });
  adresseLieuNodes.forEach((node) => {
    node.style.display = showAdresseLieu ? '' : 'none';
  });
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
      // Chaque retour ligne devient un paragraphe; escapeHtml protège le rendu.
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
        element.textContent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' EUR';
      } else if (value && String(value).trim() !== '') {
        element.textContent = String(value) + ' EUR';
      } else {
        element.textContent = ' EUR';
      }
    } else if (prop === 'type_de_chiffre') {
      // Si aucun type n'est choisi et que le chiffre est négatif, on affiche un libellé par défaut.
      const v = String(value || '').trim();
      const chiffreNum = Number(previewState.chiffre);
      const chiffreIsNegative = Number.isFinite(chiffreNum) && chiffreNum < 0;
      const label = v && v !== 'type de chiffre' ? v : (chiffreIsNegative ? 'chiffre clé' : '');
      element.textContent = label;
      element.style.display = label ? '' : 'none';
    } else {
      element.textContent = value ?? '';
    }
  });

  if (
    prop === 'nom_lieu' ||
    prop === 'adresse_lieu' ||
    prop === 'chiffre' ||
    prop === 'type_de_chiffre' ||
    prop === 'beneficiaire'
  ) {
    // Ces champs pilotent l'affichage conditionnel de la section "cartes".
    syncLocationCardsVisibility();
  }

  if (prop === 'texte_partie_1' || prop === 'texte_partie_2' || prop === 'texte_partie_3') {
    syncPartSectionsVisibility();
  }

  if (prop === 'description_remerciements') {
    syncThanksSectionVisibility();
  }
}

function renderAll() {
  // Passage principal : rendu de chaque champ stocké dans l'état.
  Object.keys(previewState).forEach((key) => {
    if (key === 'galerie_photos') {
      if (Array.isArray(previewState.galerie_photos) && previewState.galerie_photos.length) renderGallery(previewState.galerie_photos);
      return;
    }
    renderField(key);
  });
  // Passage de consolidation : dépendances visuelles transverses.
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
};
