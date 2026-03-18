import { IMAGE_DESCRIPTION_MAP, getDerivedState, normalizeProp } from './state.js';

function hasNonEmptyValue(value) {
  return String(value ?? '').trim() !== '';
}

function hasImageValue(prop) {
  const canonicalProp = normalizeProp(prop);
  const value = getDerivedState().values[canonicalProp];
  return hasNonEmptyValue(value);
}

function syncImageDescriptionVisibility(imageProp) {
  const canonicalProp = normalizeProp(imageProp);
  const descriptionProp = IMAGE_DESCRIPTION_MAP[canonicalProp];
  if (!descriptionProp) return;

  const shouldShowDescription = hasImageValue(canonicalProp);
  const descriptionNodes = Array.from(
    document.querySelectorAll(`[data-field="${descriptionProp}"]`),
  );
  descriptionNodes.forEach((descriptionNode) => {
    descriptionNode.style.display = shouldShowDescription ? '' : 'none';
  });
}

function syncAllImageDescriptionVisibility() {
  Object.keys(IMAGE_DESCRIPTION_MAP).forEach(syncImageDescriptionVisibility);
}

function syncImageSectionLayout(imageProp) {
  const canonicalProp = normalizeProp(imageProp);
  const hasImage = hasImageValue(canonicalProp);
  const layoutNodes = Array.from(
    document.querySelectorAll(`[data-image-layout="${canonicalProp}"]`),
  );

  layoutNodes.forEach((layoutNode) => {
    layoutNode.style.gridTemplateColumns = hasImage ? '' : '1fr';
    layoutNode.classList.toggle('min-h-[40dvh]', hasImage);
    layoutNode.style.minHeight = hasImage ? '' : 'fit-content';

    const mediaNodes = Array.from(
      layoutNode.querySelectorAll(`[data-image-layout-media="${canonicalProp}"]`),
    );
    mediaNodes.forEach((mediaNode) => {
      mediaNode.style.display = hasImage ? '' : 'none';
    });
  });
}

function syncAllImageSectionLayouts() {
  Object.keys(IMAGE_DESCRIPTION_MAP).forEach(syncImageSectionLayout);
}

function syncPartSectionsVisibility() {
  const derived = getDerivedState();
  [1, 2, 3].forEach((partNumber) => {
    const nodes = Array.from(
      document.querySelectorAll(`[data-part-section="${partNumber}"]`),
    );
    const shouldShow = Boolean(derived.visibility.parts[partNumber]);
    nodes.forEach((node) => {
      node.style.display = shouldShow ? '' : 'none';
    });
  });
}

function syncThanksSectionVisibility() {
  const thanksNodes = Array.from(document.querySelectorAll('[data-thanks-section]'));
  if (!thanksNodes.length) return;

  const derived = getDerivedState();
  thanksNodes.forEach((node) => {
    node.style.display = derived.visibility.thanks ? '' : 'none';
  });
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
  const derived = getDerivedState();
  const sectionNodes = Array.from(document.querySelectorAll('[data-location-section]'));
  if (!sectionNodes.length) return;

  sectionNodes.forEach((sectionNode) => {
    sectionNode.style.display = derived.visibility.locationSection ? '' : 'none';

    const lieuCard = sectionNode.querySelector('[data-location-card="lieu"]');
    const chiffreCard = sectionNode.querySelector('[data-location-card="chiffre"]');
    const beneficiaireCard = sectionNode.querySelector('[data-location-card="beneficiaire"]');

    if (lieuCard) {
      lieuCard.style.display = derived.visibility.locationCards.lieu ? '' : 'none';
    }
    if (chiffreCard) {
      chiffreCard.style.display = derived.visibility.locationCards.chiffre ? '' : 'none';
    }
    if (beneficiaireCard) {
      beneficiaireCard.style.display = derived.visibility.locationCards.beneficiaire
        ? ''
        : 'none';
    }
    syncLocationSectionLayout(sectionNode);
  });

  const nomLieuNodes = Array.from(document.querySelectorAll('[data-field="nom_lieu"]'));
  const adresseLieuNodes = Array.from(document.querySelectorAll('[data-field="adresse_lieu"]'));
  const showNomLieu = derived.visibility.locationFields.nom_lieu;
  const showAdresseLieu = derived.visibility.locationFields.adresse_lieu;

  nomLieuNodes.forEach((node) => {
    node.style.display = showNomLieu ? '' : 'none';
  });
  adresseLieuNodes.forEach((node) => {
    node.style.display = showAdresseLieu ? '' : 'none';
  });
}

export {
  hasImageValue,
  syncImageDescriptionVisibility,
  syncAllImageDescriptionVisibility,
  syncImageSectionLayout,
  syncAllImageSectionLayouts,
  syncPartSectionsVisibility,
  syncThanksSectionVisibility,
  syncLocationCardsVisibility,
};
