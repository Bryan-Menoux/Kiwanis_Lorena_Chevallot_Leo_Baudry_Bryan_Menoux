import { isDataUrl } from '../../utils/utilitaires.js';

const ALIAS_TO_CANONICAL = {
  titre_remerciement: 'titre_remerciements',
  description_remerciement: 'description_remerciements',
};

const CANONICAL_TO_ALIAS = {
  titre_remerciements: 'titre_remerciement',
  description_remerciements: 'description_remerciement',
};

const NO_DEFAULT_FALLBACK_PROPS = new Set([
  'nom_lieu',
  'adresse_lieu',
  'lien_lieu',
  'chiffre',
  'type_de_chiffre',
  'beneficiaire',
]);

const IMAGE_DESCRIPTION_MAP = {
  hero: 'description_hero',
  photo_partie_1: 'description_photo_partie_1',
  photo_partie_2: 'description_photo_partie_2',
  photo_partie_3: 'description_photo_partie_3',
};

const SINGLE_IMAGE_FIELDS = Object.keys(IMAGE_DESCRIPTION_MAP);

const PREVIEW_FALLBACKS = {
  titre: 'Titre de l\'action',
  sous_titre: '',
  date_debut: '',
  date_fin: '',
  description_hero: '',
  hero: '',
  titre_partie_1: '',
  texte_partie_1: '',
  photo_partie_1: '',
  description_photo_partie_1: '',
  nom_lieu: '',
  adresse_lieu: '',
  lien_lieu: '',
  chiffre: '',
  type_action: [],
  type_de_chiffre: '',
  beneficiaire: '',
  titre_partie_2: '',
  texte_partie_2: '',
  photo_partie_2: '',
  description_photo_partie_2: '',
  titre_partie_3: '',
  texte_partie_3: '',
  photo_partie_3: '',
  description_photo_partie_3: '',
  titre_remerciements: '',
  description_remerciements: '',
  galerie_photos: [],
};

// Source canonique de l'éditeur de preview.
let previewState = {};

// Fichiers image sélectionnés côté client. Le state garde les fichiers, pas le DOM.
let singleImageFiles = {};
let singleImageRemoved = {};
let singleImageOptimizationStates = {};

// Galerie client.
let galleryFiles = [];
let galleryDataUrls = [];
let galleryExistingUrls = [];
let galleryRemovedUrls = [];
let galleryOptimizationStates = [];

function normalizeProp(prop) {
  return ALIAS_TO_CANONICAL[prop] || prop || '';
}

function cloneArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function cloneObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value }
    : {};
}

function syncGalleryPreviewState() {
  previewState.galerie_photos = [
    ...galleryExistingUrls,
    ...galleryDataUrls,
  ];
}

function normalizePreviewState(value) {
  const nextState = cloneObject(value);

  if (Object.prototype.hasOwnProperty.call(nextState, 'titre_remerciement')) {
    nextState.titre_remerciements =
      nextState.titre_remerciements ?? nextState.titre_remerciement;
  }
  if (Object.prototype.hasOwnProperty.call(nextState, 'description_remerciement')) {
    nextState.description_remerciements =
      nextState.description_remerciements ?? nextState.description_remerciement;
  }

  if (!Array.isArray(nextState.type_action)) {
    nextState.type_action = [];
  }

  if (!Array.isArray(nextState.galerie_photos)) {
    nextState.galerie_photos = [];
  }

  SINGLE_IMAGE_FIELDS.forEach((prop) => {
    if (!Object.prototype.hasOwnProperty.call(nextState, prop)) {
      nextState[prop] = '';
    }
  });

  Object.keys(PREVIEW_FALLBACKS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(nextState, key)) {
      nextState[key] = PREVIEW_FALLBACKS[key];
    }
  });

  return nextState;
}

function setPreviewState(value) {
  previewState = normalizePreviewState(value);
  galleryExistingUrls = cloneArray(previewState.galerie_photos).filter(
    (item) => typeof item === 'string' && !isDataUrl(item),
  );
  galleryRemovedUrls = [];
  galleryFiles = [];
  galleryDataUrls = [];
  galleryOptimizationStates = [];
  singleImageFiles = {};
  singleImageRemoved = {};
  singleImageOptimizationStates = {};
}

function setField(prop, value) {
  const canonicalProp = normalizeProp(prop);
  previewState = {
    ...previewState,
    [canonicalProp]: value,
  };

  const alias = CANONICAL_TO_ALIAS[canonicalProp];
  if (alias) {
    previewState = {
      ...previewState,
      [alias]: value,
    };
  }

  if (canonicalProp === 'galerie_photos') {
    const nextUrls = cloneArray(value).filter(
      (item) => typeof item === 'string' && !isDataUrl(item),
    );
    galleryExistingUrls = nextUrls;
    syncGalleryPreviewState();
  }
}

function setSingleImageFile(prop, file) {
  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  if (file instanceof File) {
    singleImageFiles = {
      ...singleImageFiles,
      [canonicalProp]: file,
    };
    singleImageRemoved = {
      ...singleImageRemoved,
      [canonicalProp]: false,
    };
    return;
  }

  const nextFiles = { ...singleImageFiles };
  delete nextFiles[canonicalProp];
  singleImageFiles = nextFiles;
}

function markSingleImageRemoved(prop, removed = true) {
  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  const nextRemoved = { ...singleImageRemoved };
  nextRemoved[canonicalProp] = Boolean(removed);
  singleImageRemoved = nextRemoved;

  if (!removed) return;

  const nextFiles = { ...singleImageFiles };
  delete nextFiles[canonicalProp];
  singleImageFiles = nextFiles;
}

function setSingleImageOptimizationProgress(prop, progress, isActive) {
  const canonicalProp = normalizeProp(prop);
  if (!canonicalProp) return;

  const safeProgress = Number.isFinite(Number(progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progress))))
    : 0;
  singleImageOptimizationStates = {
    ...singleImageOptimizationStates,
    [canonicalProp]: {
      active: Boolean(isActive),
      progress: safeProgress,
    },
  };
}

function removeImage(field) {
  const canonicalProp = normalizeProp(field);
  if (!canonicalProp) return;

  setField(canonicalProp, '');
  markSingleImageRemoved(canonicalProp, true);
}

function addGalleryFiles(files) {
  const safeFiles = Array.isArray(files)
    ? files.filter((file) => file instanceof File)
    : [];

  if (!safeFiles.length) return [];

  galleryFiles = [...galleryFiles, ...safeFiles];
  galleryOptimizationStates = [
    ...galleryOptimizationStates,
    ...safeFiles.map(() => ({ active: false, progress: 0 })),
  ];
  return galleryFiles;
}

function setGalleryFiles(value) {
  galleryFiles = Array.isArray(value)
    ? value.filter((file) => file instanceof File)
    : [];
}

function setGalleryDataUrls(value) {
  galleryDataUrls = cloneArray(value);
  syncGalleryPreviewState();
}

function setGalleryExistingUrls(value) {
  galleryExistingUrls = cloneArray(value).filter(
    (item) => typeof item === 'string' && !isDataUrl(item),
  );
  syncGalleryPreviewState();
}

function addGalleryExistingUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (galleryExistingUrls.includes(value)) return;
  galleryExistingUrls = [...galleryExistingUrls, value];
  syncGalleryPreviewState();
}

function removeGalleryExistingUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return;
  if (!galleryExistingUrls.includes(url)) return;

  galleryRemovedUrls = galleryRemovedUrls.includes(url)
    ? galleryRemovedUrls
    : [...galleryRemovedUrls, url];
  galleryExistingUrls = galleryExistingUrls.filter((item) => item !== url);
  syncGalleryPreviewState();
}

function removeGalleryItem(index) {
  if (!Number.isInteger(index) || index < 0) return null;
  if (index >= galleryFiles.length) return null;

  const removedFile = galleryFiles[index] || null;
  galleryFiles = galleryFiles.filter((_, currentIndex) => currentIndex !== index);
  galleryDataUrls = galleryDataUrls.filter((_, currentIndex) => currentIndex !== index);
  galleryOptimizationStates = galleryOptimizationStates.filter(
    (_, currentIndex) => currentIndex !== index,
  );
  syncGalleryPreviewState();

  return removedFile;
}

function setGalleryOptimizationStates(value) {
  galleryOptimizationStates = Array.isArray(value) ? value : [];
}

function setGalleryThumbnailOptimizationProgress(index, progress, isActive) {
  if (!Number.isInteger(index) || index < 0) return;

  const safeProgress = Number.isFinite(Number(progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progress))))
    : 0;
  const nextStates = galleryOptimizationStates.slice();
  while (nextStates.length <= index) {
    nextStates.push({ active: false, progress: 0 });
  }
  nextStates[index] = {
    active: Boolean(isActive),
    progress: safeProgress,
  };
  galleryOptimizationStates = nextStates;
}

function getStateSnapshot() {
  return {
    previewState: cloneObject(previewState),
    singleImageFiles: { ...singleImageFiles },
    singleImageRemoved: { ...singleImageRemoved },
    singleImageOptimizationStates: { ...singleImageOptimizationStates },
    galleryFiles: galleryFiles.slice(),
    galleryDataUrls: galleryDataUrls.slice(),
    galleryExistingUrls: galleryExistingUrls.slice(),
    galleryRemovedUrls: galleryRemovedUrls.slice(),
    galleryOptimizationStates: galleryOptimizationStates.slice(),
  };
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

function getDerivedState() {
  const values = normalizePreviewState(previewState);
  const galleryPreviewUrls = Array.isArray(values.galerie_photos)
    ? values.galerie_photos.slice()
    : [];
  const chiffreRaw = values.chiffre;
  const chiffreIsZero =
    chiffreRaw === 0 || (typeof chiffreRaw === 'string' && chiffreRaw.trim() === '0');
  const hasLieu =
    hasNonEmptyValue(values.nom_lieu) || hasNonEmptyValue(values.adresse_lieu);
  const hasChiffre = chiffreIsZero ? false : hasChiffreValue(chiffreRaw);
  const hasBeneficiaire = hasNonEmptyValue(values.beneficiaire);
  const hasLocationSection = hasLieu || hasChiffre || hasBeneficiaire;
  const hasPart1Section = hasNonEmptyValue(values.texte_partie_1);
  const hasPart2Section = hasNonEmptyValue(values.texte_partie_2);
  const hasPart3Section = hasNonEmptyValue(values.texte_partie_3);
  const hasThanksSection = hasNonEmptyValue(values.description_remerciements);

  return {
    values,
    galleryPreviewUrls,
    visibility: {
      imageDescriptions: {
        hero: hasNonEmptyValue(values.hero),
        photo_partie_1: hasNonEmptyValue(values.photo_partie_1),
        photo_partie_2: hasNonEmptyValue(values.photo_partie_2),
        photo_partie_3: hasNonEmptyValue(values.photo_partie_3),
      },
      imageLayouts: {
        hero: hasNonEmptyValue(values.hero),
        photo_partie_1: hasNonEmptyValue(values.photo_partie_1),
        photo_partie_2: hasNonEmptyValue(values.photo_partie_2),
        photo_partie_3: hasNonEmptyValue(values.photo_partie_3),
      },
      parts: {
        1: hasPart1Section,
        2: hasPart2Section,
        3: hasPart3Section,
      },
      thanks: hasThanksSection,
      locationSection: hasLocationSection,
      locationCards: {
        lieu: hasLieu,
        chiffre: hasChiffre,
        beneficiaire: hasBeneficiaire,
      },
      locationFields: {
        nom_lieu: hasNonEmptyValue(values.nom_lieu),
        adresse_lieu: hasNonEmptyValue(values.adresse_lieu),
      },
    },
    labels: {
      chiffreTypeLabel: hasTypeDeChiffreValue(values.type_de_chiffre)
        ? String(values.type_de_chiffre)
        : (Number(values.chiffre) < 0 ? 'chiffre clé' : ''),
    },
  };
}

export {
  ALIAS_TO_CANONICAL,
  CANONICAL_TO_ALIAS,
  IMAGE_DESCRIPTION_MAP,
  NO_DEFAULT_FALLBACK_PROPS,
  PREVIEW_FALLBACKS,
  SINGLE_IMAGE_FIELDS,
  previewState,
  singleImageFiles,
  singleImageRemoved,
  singleImageOptimizationStates,
  galleryFiles,
  galleryDataUrls,
  galleryExistingUrls,
  galleryRemovedUrls,
  galleryOptimizationStates,
  normalizeProp,
  setPreviewState,
  setField,
  setSingleImageFile,
  markSingleImageRemoved,
  setSingleImageOptimizationProgress,
  removeImage,
  addGalleryFiles,
  setGalleryFiles,
  setGalleryDataUrls,
  setGalleryExistingUrls,
  addGalleryExistingUrl,
  removeGalleryExistingUrl,
  removeGalleryItem,
  setGalleryOptimizationStates,
  setGalleryThumbnailOptimizationProgress,
  getStateSnapshot,
  getDerivedState,
};
