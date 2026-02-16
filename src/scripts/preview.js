// État d'exécution pour la prévisualisation live
let previewState = {};

import { formatDateLong } from '../utils/utilitaires.js';

// raccourcis pour sélectionner des éléments DOM
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

// échapper les entités HTML basiques pour éviter l'injection lors de l'insertion en HTML
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// formate un intervalle de dates : retour vide si aucune date, sinon "début au fin" ou la valeur disponible
function formatDateRange(d1, d2) {
  if (!d1 && !d2) return '';
  try {
    const start = d1 ? formatDateLong(d1) : '';
    const end = d2 ? formatDateLong(d2) : '';
    return start && end ? `${start} au ${end}` : (start || end);
  } catch (e) { return ''; }
}

// détecte si une valeur est une data URL ou blob URL
function isDataUrl(v) {
  return typeof v === 'string' && (v.startsWith('data:') || v.startsWith('blob:'));
}

// met à jour tous les éléments ayant l'attribut data-field égal à prop
function renderField(prop) {
  const nodes = Array.from(document.querySelectorAll(`[data-field="${prop}"]`));
  if (!nodes.length) return;
  const val = previewState[prop];
  nodes.forEach((node) => {
    if (node.tagName === 'IMG') {
      // image : définir la source et paramètres de chargement
      try { console.debug('[preview] update IMG', prop, val && (val.length ? (val.slice ? val.slice(0,50) : String(val)) : val)); } catch (e) {}
      node.src = val || '';
      node.loading = 'lazy';
      node.decoding = 'async';
      return;
    }

    // champs texte multi-lignes stockés avec des sauts de ligne -> paragraphes
    if (prop.startsWith('texte_partie') || prop === 'description_remerciements') {
      node.innerHTML = (String(val || '')).split('\n').map(l => `<p>${escapeHtml(l)}</p>`).join('');
      return;
    }

    // champs de date affichés via la fonction de formatage d'intervalle
    if (prop === 'dates' || prop === 'date_debut' || prop === 'date_fin') {
      const d = formatDateRange(previewState.date_debut, previewState.date_fin);
      node.textContent = d;
      return;
    }

    // cas général : texte simple
    node.textContent = val ?? '';
  });
}

// rend la galerie principale (élément #photoGrid dans #actionPreview)
function renderGallery(arr) {
  const root = document.getElementById('actionPreview');
  if (!root) return;

  const photoGrid = root.querySelector('#photoGrid');
  if (!photoGrid) return;
  photoGrid.innerHTML = '';

  // créer les vignettes
  arr.forEach((url, idx) => {
    const div = document.createElement('div');
    div.className = 'relative w-full h-full overflow-hidden rounded-box cursor-pointer';
    div.setAttribute('data-photo-index', String(idx));
    div.setAttribute('data-photo-url', url);

    const img = document.createElement('img');
    img.alt = 'Photo de la galerie';
    img.className = 'absolute inset-0 w-full h-full object-center object-cover';
    img.src = url;
    img.loading = 'lazy';
    img.decoding = 'async';
    div.appendChild(img);

    photoGrid.appendChild(div);
  });
  photoGrid.dataset.photoCount = String(arr.length);

  // attendre que toutes les images aient déclenché load/complete pour appliquer le layout
  const imgs = photoGrid.querySelectorAll('img');
  let loaded = 0;
  const applyAndReveal = () => {
    // si un script externe expose setGridStyles, l'appeler
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      try { window.setGridStyles(); } catch (e) {}
    }

    // bind d'ouverture modal sur clic : on cherche l'élément le plus proche avec data-photo-index
    if (!photoGrid.__previewBound) {
      photoGrid.addEventListener('click', function (e) {
        const photoEl = e.target.closest && e.target.closest('[data-photo-index]') ? e.target.closest('[data-photo-index]') : null;
        if (photoEl) {
          const url = photoEl.getAttribute('data-photo-url');
          if (url && typeof window !== 'undefined' && typeof window.openModal === 'function') {
            try { window.openModal(url); } catch (err) {}
          }
        }
      });
      photoGrid.__previewBound = true;
    }
  };

  if (imgs.length === 0) {
    applyAndReveal();
  } else {
    // écouter load/error pour chaque image et invoquer applyAndReveal lorsque toutes sont traitées
    imgs.forEach((img) => {
      if (img.complete) {
        loaded += 1;
        if (loaded === imgs.length) applyAndReveal();
      } else {
        img.addEventListener('load', () => {
          loaded += 1;
          if (loaded === imgs.length) applyAndReveal();
        });
        img.addEventListener('error', () => {
          loaded += 1;
          if (loaded === imgs.length) applyAndReveal();
        });
      }
    });
  }
}

// synchronise la valeur d'un hidden input avec previewState[prop]
function updateHidden(prop) {
  const hid = document.getElementById(`hidden_${prop}`);
  if (!hid) return;
  const val = previewState[prop];
  hid.value = Array.isArray(val) ? JSON.stringify(val) : (val ?? '');
}

// affiche les miniatures (data URLs) sélectionnées dans le formulaire
function renderFormGalleryThumbnails(input, dataUrls) {
  const container = document.getElementById('gallerySelected');
  if (!container) return;
  container.innerHTML = '';

  dataUrls.forEach((url, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative overflow-hidden rounded-md';
    wrap.style.paddingBottom = '100%';

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Miniature';
    img.className = 'absolute inset-0 w-full h-full object-cover';
    wrap.appendChild(img);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
    btn.setAttribute('data-index', String(idx));
    btn.innerHTML = '×';
    wrap.appendChild(btn);

    container.appendChild(wrap);
  });

  // attacher un seul handler par input pour gérer la suppression d'une miniature sélectionnée
  if (!container.__boundInputId || container.__boundInputId !== (input && input.id)) {
    container.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('[data-index]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (Number.isNaN(idx)) return;

      // reconstruire DataTransfer sans l'élément supprimé
      const oldDt = input.__dt || new DataTransfer();
      const filesArr = Array.from(oldDt.files);
      filesArr.splice(idx, 1);
      const newDt = new DataTransfer();
      filesArr.forEach((f) => newDt.items.add(f));
      input.__dt = newDt;
      input.files = newDt.files;

      // relire les fichiers restants en data URLs pour ré-afficher les miniatures
      const readPromises = Array.from(newDt.files).map((f) => new Promise((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.readAsDataURL(f);
      }));

      Promise.all(readPromises).then((dataUrls) => {
        // combiner les URLs déjà présentes côté serveur et les nouvelles data URLs
        const serverUrls = Array.isArray(previewState.galerie_photos)
          ? previewState.galerie_photos.filter(v => typeof v === 'string' && !isDataUrl(v))
          : [];
        const combined = serverUrls.concat(dataUrls);
        previewState.galerie_photos = combined;
        renderGallery(combined);
        updateHidden('galerie_photos');
        // réafficher les miniatures à partir des data URLs actuelles
        renderFormGalleryThumbnails(input, dataUrls);
      }).catch(() => {
        // en cas d'erreur, conserver les images serveur et vider les miniatures de fichiers
        previewState.galerie_photos = previewState.galerie_photos || [];
        renderGallery(previewState.galerie_photos);
        renderFormGalleryThumbnails(input, []);
      });
    });
    container.__boundInputId = input.id;
  }
}

// affiche les miniatures des images déjà présentes côté serveur (avec boutons de suppression)
function renderExistingThumbnails(arr) {
  const container = document.getElementById('galleryExisting');
  if (!container) return;
  container.innerHTML = '';
  arr.forEach((url, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative overflow-hidden rounded-md';
    wrap.style.paddingBottom = '100%';

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Miniature existante';
    img.className = 'absolute inset-0 w-full h-full object-cover';
    wrap.appendChild(img);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
    btn.setAttribute('data-existing-index', String(idx));
    btn.innerHTML = '×';
    wrap.appendChild(btn);

    container.appendChild(wrap);
  });

  // clic sur une miniature existante -> marquer comme supprimée
  if (!container.__bound) {
    container.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('[data-existing-index]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-existing-index'), 10);
      if (Number.isNaN(idx)) return;
      const url = arr[idx];

      const hidRemove = document.getElementById('hidden_remove_galerie_photos');
      container.__removed = container.__removed || [];
      container.__removed.push(url);
      if (hidRemove) hidRemove.value = JSON.stringify(container.__removed);

      // retirer l'URL du previewState et re-render
      previewState.galerie_photos = (previewState.galerie_photos || []).filter((v) => v !== url);
      const remainingExisting = (previewState.galerie_photos || []).filter((v) => typeof v === 'string' && !isDataUrl(v));
      renderExistingThumbnails(remainingExisting);
      renderGallery(previewState.galerie_photos || []);
      updateHidden('galerie_photos');
    });
    container.__bound = true;
  }
}

// gère les changements sur les inputs text/select/date etc.
function handleInputElement(el) {
  if (!el) return;
  const prop = el.getAttribute('data-prop');
  if (!prop) return;
  const val = el.value;
  previewState[prop] = val;

  // quelques alias/conversions spécifiques
  if (prop === 'titre_remerciement') previewState['titre_remerciements'] = val;
  if (prop === 'description_remerciement') previewState['description_remerciements'] = val;

  updateHidden(prop);

  // si dates modifiées, rerendre le champ affichant l'intervalle
  if (prop === 'date_debut' || prop === 'date_fin') {
    renderField('dates');
  }
  renderField(prop);
  if (prop === 'titre_remerciement') renderField('titre_remerciements');
  if (prop === 'description_remerciement') renderField('description_remerciements');
}

// gère les inputs de type "file" (galerie multiple ou image unique)
function handleFileElement(el) {
  if (!el) return;
  const prop = el.getAttribute('data-prop-file');
  if (!prop) return;
  const files = el.files;
  if (!files || files.length === 0) return;

  // traitement pour la galerie multiple
  if (prop === 'galerie_photos') {
    const input = el;
    if (!input.__dt) input.__dt = new DataTransfer();
    const dt = input.__dt;
    const currentCount = dt.files.length;
    const remaining = Math.max(0, 8 - currentCount);
    if (remaining === 0) return; // limite atteinte
    const toAdd = Math.min(files.length, remaining);
    for (let i = 0; i < toAdd; i++) {
      dt.items.add(files[i]);
    }
    input.files = dt.files;

    const fileList = Array.from(dt.files);
    const readPromises = fileList.map((f) => new Promise((res) => {
      const r = new FileReader();
      r.onload = (ev) => res(ev.target.result);
      r.readAsDataURL(f);
    }));

    Promise.all(readPromises).then((dataUrls) => {
      // conserver les URLs serveur et ajouter les nouvelles data-URLs
      const serverUrls = Array.isArray(previewState.galerie_photos)
        ? previewState.galerie_photos.filter(v => typeof v === 'string' && !isDataUrl(v))
        : [];
      const combined = serverUrls.concat(dataUrls);
      previewState.galerie_photos = combined;
      renderGallery(combined);
      updateHidden('galerie_photos');
      renderFormGalleryThumbnails(input, dataUrls);
    }).catch(() => {
      previewState.galerie_photos = previewState.galerie_photos || [];
      renderGallery(previewState.galerie_photos);
      renderFormGalleryThumbnails(input, []);
    });

    return;
  }

  // traitement pour une image unique
  const f = files[0];

  // s'assurer que input.files contient bien le fichier via DataTransfer (compatibilité soumission)
  try {
    if (el) {
      const input = el;
      const dt = new DataTransfer();
      dt.items.add(f);
      input.__dt = dt;
      input.files = dt.files;
      try {
        const form = document.getElementById('leftForm');
        if (form) {
          const removeEl = document.getElementById(`remove_${prop}`);
          if (removeEl && removeEl.parentElement) removeEl.parentElement.removeChild(removeEl);
        }
      } catch (e) {}
    }
  } catch (e) {}

  // si aucun container d'existing n'existe, le créer pour afficher l'aperçu intégré
  try {
    const existingId = `existing_${prop}_container`;
    let existingContainer = document.getElementById(existingId);
    if (!existingContainer) {
      const inputEl = el || document.querySelector(`[data-prop-file="${prop}"]`);
      const ref = inputEl ? inputEl.closest('label') || inputEl.parentElement : null;
      if (ref && ref.parentElement) {
        existingContainer = document.createElement('div');
        existingContainer.className = 'mt-2';
        existingContainer.id = existingId;
        const lab = document.createElement('label');
        lab.className = 'block text-sm font-medium mb-1';
        lab.textContent = 'Image actuelle';
        const wrap = document.createElement('div');
        wrap.className = 'relative';
        const img = document.createElement('img');
        img.setAttribute('data-field', prop);
        img.alt = 'Aperçu';
        img.className = 'w-full h-[25dvh] object-cover rounded';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'existing-single-remove absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
        removeBtn.setAttribute('data-prop', prop);
        removeBtn.innerHTML = '×';
        wrap.appendChild(removeBtn);
        wrap.appendChild(img);
        existingContainer.appendChild(lab);
        existingContainer.appendChild(wrap);
        try { ref.parentElement.insertBefore(existingContainer, ref.nextSibling); } catch (e) { ref.parentElement.appendChild(existingContainer); }
        try { bindExistingSingleRemoveButtons(); } catch (e) {}
      }
    } else if (existingContainer && existingContainer.__hiddenByPreview) {
      existingContainer.style.display = '';
      existingContainer.__hiddenByPreview = false;
    }
  } catch (e) {}

  const r = new FileReader();
  r.onload = (ev) => {
    const dataUrl = ev.target.result;
    previewState[prop] = dataUrl; // stocker la data URL pour l'aperçu
    renderField(prop);

    // si un container existant avait été caché, le réafficher
    try {
      const existingContainer = document.getElementById(`existing_${prop}_container`);
      if (existingContainer && existingContainer.__hiddenByPreview) {
        existingContainer.style.display = '';
        existingContainer.__hiddenByPreview = false;
      }
      try {
        const existingImg = existingContainer ? existingContainer.querySelector(`img[data-field="${prop}"]`) : null;
        if (existingImg) {
          existingImg.src = dataUrl;
          existingImg.loading = 'lazy';
          existingImg.decoding = 'async';
        }
      } catch (e) {}
    } catch (e) {}

    try { updateHidden(prop); } catch (e) {}
    try { renderFormImagePreview(prop, dataUrl); } catch (e) {}
  };
  r.readAsDataURL(f);
}

// affiche un aperçu inline pour un champ image unique (preview_{prop})
function renderFormImagePreview(prop, dataUrl) {
  const container = document.getElementById(`preview_${prop}`);
  if (!container) return;

  container.innerHTML = '';
  if (!dataUrl || !isDataUrl(dataUrl)) return;

  const wrap = document.createElement('div');
  wrap.className = 'relative overflow-hidden rounded-md';
  wrap.style.paddingBottom = '56%';

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Aperçu';
  img.className = 'absolute inset-0 w-full h-full object-cover';
  wrap.appendChild(img);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center';
  btn.innerHTML = '×';
  wrap.appendChild(btn);

  container.appendChild(wrap);

  // suppression de l'aperçu par l'utilisateur : nettoyer input, previewState et hidden
  btn.addEventListener('click', function () {
    const input = document.querySelector(`[data-prop-file="${prop}"]`);
    if (input) {
      try {
        input.value = '';
        if (input.__dt) {
          input.__dt = new DataTransfer();
          input.files = input.__dt.files;
        }
      } catch (e) {}
    }
    previewState[prop] = '';
    renderField(prop);
    updateHidden(prop);
    container.innerHTML = '';
    try {
      const existingContainer = document.getElementById(`existing_${prop}_container`);
      if (existingContainer) {
        const existingImg = existingContainer.querySelector(`img[data-field="${prop}"]`);
        if (existingImg) existingImg.src = '';
        existingContainer.style.display = 'none';
        existingContainer.__hiddenByPreview = true;
      }
    } catch (e) {}
  });
}

// rendre tous les champs à partir du previewState
function renderAll() {
  Object.keys(previewState).forEach((k) => {
    if (k === 'galerie_photos') {
      if (Array.isArray(previewState.galerie_photos) && previewState.galerie_photos.length) renderGallery(previewState.galerie_photos);
      return;
    }
    renderField(k);
  });
}

// initialisation : récupérer les données placeholder et binder les handlers
function initPreview() {
  const root = document.getElementById('actionPreview');
  const placeholderScript = qs('#previewData');
  const placeholderFromWindow = typeof window !== 'undefined' && (window.__previewData !== undefined) ? window.__previewData : null;
  const placeholder = placeholderFromWindow || (placeholderScript ? JSON.parse(placeholderScript.textContent || '{}') : {});
  previewState = Object.assign({}, placeholder);

  const form = document.getElementById('leftForm');

  // initialiser les inputs du formulaire avec les valeurs de previewState
  if (form) {
    Array.from(form.querySelectorAll('[data-prop]')).forEach((el) => {
      const p = el.getAttribute('data-prop');
      if (p && previewState[p] !== undefined && 'value' in el) el.value = previewState[p];
    });
  }

  renderAll();
  bindExistingSingleRemoveButtons();

  // remplir les hidden inputs initiaux (sauf galerie)
  if (form) {
    Object.keys(previewState).forEach((k) => {
      if (k === 'galerie_photos') return;
      updateHidden(k);
    });

    const hidGallery = document.getElementById('hidden_galerie_photos');
    if (hidGallery) hidGallery.value = '';
    const existing = Array.isArray(previewState.galerie_photos) ? previewState.galerie_photos.filter(v => typeof v === 'string' && !isDataUrl(v)) : [];
    if (existing.length) renderExistingThumbnails(existing);
  }

  // binder les écouteurs sur le formulaire
  if (form) {
    Array.from(form.querySelectorAll('[data-prop]')).forEach((el) => {
      const ev = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
      el.addEventListener(ev, (e) => {
        handleInputElement(e.currentTarget);
      });
    });
    Array.from(form.querySelectorAll('[data-prop-file]')).forEach((el) => {
      el.addEventListener('change', (e) => {
        handleFileElement(e.currentTarget);
      });
    });

    // avant soumission : synchroniser tous les hidden_* et la galerie
    form.addEventListener('submit', () => {
      try {
        const fileInputs = Array.from(form.querySelectorAll('[data-prop-file]'));
        const filesReport = fileInputs.map((inp) => ({ name: inp.getAttribute('data-prop-file') || inp.name, count: inp.files ? inp.files.length : 0, files: inp.files ? Array.from(inp.files).map(f => ({ name: f.name, size: f.size })) : [] }));
      } catch (e) {}

      Array.from(form.querySelectorAll('[data-prop]')).forEach((el) => {
        const p = el.getAttribute('data-prop');
        if (!p) return;
        const hid = document.getElementById(`hidden_${p}`);
        if (hid) {
          hid.value = el.value ?? '';
        }
      });

      updateHidden('galerie_photos');
    });
  }
}

// bind global pour les boutons de suppression d'images existantes
function bindExistingSingleRemoveButtons() {
  if (document.__existingRemoveBound) return;
  document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.existing-single-remove') : null;
    if (!btn) return;

    const prop = btn.getAttribute('data-prop');
    if (!prop) return;
    const form = document.getElementById('leftForm');

    // créer ou mettre à jour un hidden remove_{prop} pour indiquer la suppression côté serveur
    if (form) {
      let hid = document.getElementById(`remove_${prop}`);
      if (!hid) {
        hid = document.createElement('input');
        hid.type = 'hidden';
        hid.id = `remove_${prop}`;
        hid.name = `remove_${prop}`;
        hid.value = '1';
        form.appendChild(hid);
      } else {
        hid.value = '1';
      }
    }

    // masquer le container existant pour que l'utilisateur voie la suppression
    const container = btn.closest && btn.closest('[id^="existing_"]') ? btn.closest('[id^="existing_"]') : btn.parentElement && btn.parentElement.parentElement;
    if (container) {
      try {
        container.style.display = 'none';
        container.__hiddenByPreview = true;
      } catch (e) {
        try { if (container.remove) container.remove(); } catch (ee) {}
      }
    }

    previewState[prop] = '';
    renderField(prop);

    if (form) {
      let hidField = document.getElementById(`hidden_${prop}`);
      if (!hidField) {
        hidField = document.createElement('input');
        hidField.type = 'hidden';
        hidField.id = `hidden_${prop}`;
        hidField.name = prop;
        form.appendChild(hidField);
      }
      hidField.value = '';
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
