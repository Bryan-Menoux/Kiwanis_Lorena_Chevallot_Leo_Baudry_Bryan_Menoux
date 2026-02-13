// Script client responsable de la prévisualisation live sur la page de création
// Modifications réalisées :
// - Lecture d'un objet placeholder injecté côté serveur via `window.__previewData`
// - Mise à jour du DOM en ciblant les attributs `data-field` dans `#actionPreview`
// - Gestion des champs fichier (FileReader) pour aperçus d'images
// - Ajout de logs et d'un export `window.__initPreview` pour faciliter le debug
// Ce fichier est chargé comme module externe (import ?url dans l'ASTRO) pour
// conserver le même timing d'exécution qu'une ressource servie (comme précédemment).


// État d'exécution pour la prévisualisation live
let previewState = {};

// Script simplifié (scopé à `#actionPreview`)
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateRange(d1, d2) {
  if (!d1 && !d2) return '';
  try {
    const start = d1 ? new Date(d1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const end = d2 ? new Date(d2).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return start && end ? `${start} au ${end}` : (start || end);
  } catch (e) { return ''; }
}

function isDataUrl(v) {
  return typeof v === 'string' && (v.startsWith('data:') || v.startsWith('blob:'));
}

function renderField(prop) {
  const root = document.getElementById('actionPreview');
  if (!root) return;
  const nodes = Array.from(root.querySelectorAll(`[data-field="${prop}"]`));
  if (!nodes.length) return;
  const val = previewState[prop];
  nodes.forEach((node) => {
    if (node.tagName === 'IMG') {
      node.src = val || '';
      node.loading = 'lazy';
      node.decoding = 'async';
      // image updated
      return;
    }
    if (prop.startsWith('texte_partie') || prop === 'description_remerciements') {
      node.innerHTML = (String(val || '')).split('\n').map(l => `<p>${escapeHtml(l)}</p>`).join('');
      return;
    }
    if (prop === 'dates' || prop === 'date_debut' || prop === 'date_fin') {
      const d = formatDateRange(previewState.date_debut, previewState.date_fin);
      node.textContent = d;
      return;
    }
    node.textContent = val ?? '';
  });
}

function renderGallery(arr) {
  const root = document.getElementById('actionPreview');
  if (!root) return;
  const photoGrid = root.querySelector('#photoGrid');
  if (!photoGrid) return;
  photoGrid.innerHTML = '';
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

  // Wait for images to load then apply grid styles (to avoid layout flash)
  const imgs = photoGrid.querySelectorAll('img');
  let loaded = 0;
  const applyAndReveal = () => {
    // If gallery.js is loaded as a plain script it exposes a global `setGridStyles`.
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      try { window.setGridStyles(); } catch (e) {}
    }
    photoGrid.classList.remove('opacity-0');

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

function updateHidden(prop) {
  const hid = document.getElementById(`hidden_${prop}`);
  if (!hid) return;
  const val = previewState[prop];
  hid.value = Array.isArray(val) ? JSON.stringify(val) : (val ?? '');
}

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

  // bind click handler once per input
  if (!container.__boundInputId || container.__boundInputId !== (input && input.id)) {
    container.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('[data-index]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (Number.isNaN(idx)) return;

      const oldDt = input.__dt || new DataTransfer();
      const filesArr = Array.from(oldDt.files);
      filesArr.splice(idx, 1);
      const newDt = new DataTransfer();
      filesArr.forEach((f) => newDt.items.add(f));
      input.__dt = newDt;
      input.files = newDt.files;

      const readPromises = Array.from(newDt.files).map((f) => new Promise((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.readAsDataURL(f);
      }));

      Promise.all(readPromises).then((dataUrls) => {
        previewState.galerie_photos = dataUrls;
        renderGallery(dataUrls);
        updateHidden('galerie_photos');
        renderFormGalleryThumbnails(input, dataUrls);
      }).catch(() => {
        previewState.galerie_photos = [];
        renderGallery([]);
        renderFormGalleryThumbnails(input, []);
      });
    });
    container.__boundInputId = input.id;
  }
}

function handleInputElement(el) {
  if (!el) return;
  const prop = el.getAttribute('data-prop');
  if (!prop) return;
  const val = el.value;
  previewState[prop] = val;
  if (prop === 'titre_remerciement') previewState['titre_remerciements'] = val;
  if (prop === 'description_remerciement') previewState['description_remerciements'] = val;
  updateHidden(prop);
  if (prop === 'date_debut' || prop === 'date_fin') {
    renderField('dates');
  }
  renderField(prop);
  if (prop === 'titre_remerciement') renderField('titre_remerciements');
  if (prop === 'description_remerciement') renderField('description_remerciements');
}

function handleFileElement(el) {
  if (!el) return;
  const prop = el.getAttribute('data-prop-file');
  if (!prop) return;
  const files = el.files;
  if (!files || files.length === 0) return;
  if (prop === 'galerie_photos') {
    const input = el;
    if (!input.__dt) input.__dt = new DataTransfer();
    const dt = input.__dt;
    const currentCount = dt.files.length;
    const remaining = Math.max(0, 8 - currentCount);
    if (remaining === 0) return;
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
      previewState.galerie_photos = dataUrls;
      renderGallery(dataUrls);
      updateHidden('galerie_photos');
      renderFormGalleryThumbnails(input, dataUrls);
    }).catch(() => {
      previewState.galerie_photos = [];
      renderGallery([]);
      renderFormGalleryThumbnails(input, []);
    });

    return;
  }
  // image unique
  const f = files[0];
  const r = new FileReader();
  r.onload = (ev) => {
    previewState[prop] = ev.target.result;
    renderField(prop);
  };
  r.readAsDataURL(f);
}

function renderAll() {
  Object.keys(previewState).forEach((k) => {
    if (k === 'galerie_photos') {
      if (Array.isArray(previewState.galerie_photos) && previewState.galerie_photos.length) renderGallery(previewState.galerie_photos);
      return;
    }
    renderField(k);
  });
}

function initPreview() {
  const root = document.getElementById('actionPreview');
  const placeholderScript = qs('#previewData');
  const placeholderFromWindow = typeof window !== 'undefined' && (window.__previewData !== undefined) ? window.__previewData : null;
  const placeholder = placeholderFromWindow || (placeholderScript ? JSON.parse(placeholderScript.textContent || '{}') : {});
  previewState = Object.assign({}, placeholder);

  const form = document.getElementById('leftForm');
  // initialiser les valeurs visibles du formulaire depuis le placeholder
  if (form) {
    Array.from(form.querySelectorAll('[data-prop]')).forEach((el) => {
      const p = el.getAttribute('data-prop');
      if (p && previewState[p] !== undefined && 'value' in el) el.value = previewState[p];
    });
  }

  renderAll();

  // initial sync: populate hidden inputs from previewState so server receives values
  if (form) {
    // populate hidden inputs from previewState, but DO NOT populate the gallery hidden input
    // because placeholder images should not be counted as user-selected files.
    Object.keys(previewState).forEach((k) => {
      if (k === 'galerie_photos') return;
      updateHidden(k);
    });

    // ensure gallery hidden input is empty at start (only user selections populate it)
    const hidGallery = document.getElementById('hidden_galerie_photos');
    if (hidGallery) hidGallery.value = '';
  }

  // brancher les écouteurs d'événements
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

    // Avant la soumission, s'assurer que tous les hidden_* sont à jour
    form.addEventListener('submit', () => {
      Array.from(form.querySelectorAll('[data-prop]')).forEach((el) => {
        const p = el.getAttribute('data-prop');
        if (!p) return;
        const hid = document.getElementById(`hidden_${p}`);
        if (hid) {
          hid.value = el.value ?? '';
        }
      });

      // sync gallery hidden input if present
      updateHidden('galerie_photos');
    });
  }
}

// exposer un déclencheur manuel pour le débogage
try {
  if (typeof window !== 'undefined') {
    window.__initPreview = initPreview;
  }
} catch (e) {}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreview);
} else {
  initPreview();
}
