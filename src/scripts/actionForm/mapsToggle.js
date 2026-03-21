document.addEventListener('DOMContentLoaded', () => {
  const mapInput = document.querySelector('#manual_lien_lieu');
  const btn = document.getElementById('btn_voir_maps');
  if (!(mapInput instanceof HTMLInputElement) || !(btn instanceof HTMLElement)) return;

  if (mapInput.dataset.mapsToggleBound === 'true') return;
  mapInput.dataset.mapsToggleBound = 'true';

  const updateBtn = () => {
    const val = mapInput.value || '';
    if (val.trim()) {
      btn.setAttribute('href', val);
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
      btn.removeAttribute('href');
    }
  };

  updateBtn();
  mapInput.addEventListener('input', updateBtn);
  mapInput.addEventListener('change', updateBtn);

  const manualToggle = document.getElementById('manual_toggle_link');
  const manualContainer = document.getElementById('manual_lien_lieu_container');
  const cancelBtn = document.getElementById('manual_cancel_btn');
  const validateBtn = document.getElementById('manual_validate_btn');

  if (!(manualToggle instanceof HTMLElement)) return;
  if (!(manualContainer instanceof HTMLElement)) return;

  const openEditor = () => {
    manualContainer.style.display = '';
    mapInput.focus();
  };

  const closeEditor = () => {
    manualContainer.style.display = 'none';
  };

  manualToggle.addEventListener('click', (e) => {
    e.preventDefault();
    openEditor();
  });

  if (cancelBtn instanceof HTMLElement) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditor();
    });
  }

  if (validateBtn instanceof HTMLElement) {
    validateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updateBtn();
      closeEditor();
    });
  }
});
