import PREVIEW_DEFAULTS from '../previewDefaults.js';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-edit-target]').forEach((btn) => {
    const target = btn.getAttribute('data-edit-target');
    if (!target) return;

    const input = document.getElementById(`input_${target}`);
    const h4 = document.getElementById(`titre_label_${target.replace(/^titre_/, '')}`);

    if (!(input instanceof HTMLInputElement)) return;
    if (!(h4 instanceof HTMLElement)) return;
    if (!(btn instanceof HTMLElement)) return;

    const example = PREVIEW_DEFAULTS[target] || input.dataset.example || '';
    if (example) input.dataset.example = example;

    input.style.display = 'none';
    btn.dataset.editing = 'false';

    const rawPlaceholder =
      input.dataset.example ||
      (input.getAttribute('placeholder') || h4.textContent?.trim() || '').replace(/^Ex :\s*/i, '');
    const displayPlaceholder = `Ex : ${rawPlaceholder}`;
    const getDisplayText = (value) => String(value || '').trim() || rawPlaceholder;
    const setLinkedLabels = (value) => {
      const labelText = getDisplayText(value);
      h4.textContent = labelText;
      document.querySelectorAll(`[data-label-for="${target}"]`).forEach((el) => {
        el.textContent = labelText;
      });
    };
    const syncPreview = () => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    if (!h4.textContent?.trim() || h4.textContent.trim() === rawPlaceholder) {
      h4.textContent = rawPlaceholder;
    }
    input.setAttribute('placeholder', displayPlaceholder);

    let valueBeforeEdit = input.value || '';
    if (!valueBeforeEdit && h4.textContent?.trim() && h4.textContent.trim() !== rawPlaceholder) {
      valueBeforeEdit = h4.textContent.trim();
      input.value = valueBeforeEdit;
    }
    setLinkedLabels(valueBeforeEdit);

    const setEditState = (isEditing, shouldSave = false) => {
      if (isEditing) {
        valueBeforeEdit = input.value || '';
        h4.style.display = 'none';
        input.style.display = '';
        input.value = valueBeforeEdit;
        input.focus();
        btn.textContent = 'Valider';
        btn.dataset.editing = 'true';
        btn.setAttribute('aria-pressed', 'true');
        return;
      }

      input.style.display = 'none';
      h4.style.display = '';
      if (shouldSave) {
        setLinkedLabels(input.value);
        syncPreview();
      } else {
        input.value = valueBeforeEdit;
        setLinkedLabels(valueBeforeEdit);
        syncPreview();
      }
      btn.textContent = 'Modifier le titre de la section';
      btn.dataset.editing = 'false';
      btn.setAttribute('aria-pressed', 'false');
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-ghost rounded-md! h-full px-2 py-1 bg-base-100 ml-2';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.display = 'none';
    btn.parentNode?.insertBefore(cancelBtn, btn.nextSibling);

    btn.addEventListener('click', () => {
      if (btn.dataset.editing === 'false') {
        setEditState(true, false);
        cancelBtn.style.display = '';
      } else {
        setEditState(false, true);
        cancelBtn.style.display = 'none';
      }
    });

    cancelBtn.addEventListener('click', () => {
      setEditState(false, false);
      cancelBtn.style.display = 'none';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setEditState(false, true);
        cancelBtn.style.display = 'none';
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditState(false, false);
        cancelBtn.style.display = 'none';
      }
    });
  });
});
