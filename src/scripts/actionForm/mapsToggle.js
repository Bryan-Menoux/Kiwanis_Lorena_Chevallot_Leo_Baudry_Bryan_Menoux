const initMapsToggle = () => {
  const mapInput = document.querySelector('#manual_lien_lieu');
  const manualToggle = document.getElementById('manual_toggle_link');
  const manualContainer = document.getElementById('manual_lien_lieu_container');
  const cancelBtn = document.getElementById('manual_cancel_btn');
  const validateBtn = document.getElementById('manual_validate_btn');

  if (!(mapInput instanceof HTMLInputElement)) return;
  if (!(manualToggle instanceof HTMLElement)) return;
  if (!(manualContainer instanceof HTMLElement)) return;
  if (manualToggle.dataset.mapsToggleBound === 'true') return;

  manualToggle.dataset.mapsToggleBound = 'true';

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
      mapInput.dispatchEvent(new Event('input', { bubbles: true }));
      mapInput.dispatchEvent(new Event('change', { bubbles: true }));
      closeEditor();
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMapsToggle, { once: true });
} else {
  initMapsToggle();
}
