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
  arr.forEach((url) => {
    const div = document.createElement('div');
    div.className = 'relative w-full h-full overflow-hidden rounded-box cursor-pointer';
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
  photoGrid.classList.remove('opacity-0');
}

function updateHidden(prop) {
  const hid = document.getElementById(`hidden_${prop}`);
  if (!hid) return;
  const val = previewState[prop];
  hid.value = Array.isArray(val) ? JSON.stringify(val) : (val ?? '');
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
    const arr = [];
    const max = Math.min(files.length, 8);
    let read = 0;
    for (let i = 0; i < max; i++) {
      const f = files[i];
      const r = new FileReader();
      r.onload = (ev) => {
        arr.push(ev.target.result);
        read += 1;
        if (read === max) {
          previewState.galerie_photos = arr;
          renderGallery(arr);
          updateHidden('galerie_photos');
        }
      };
      r.readAsDataURL(f);
    }
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
    Object.keys(previewState).forEach((k) => updateHidden(k));
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
