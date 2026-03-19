import { dispatch } from '../preview/dispatcher.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leftForm');
  if (!(form instanceof HTMLFormElement)) return;

  if (form.dataset.imageDeletionBound === 'true') return;
  form.dataset.imageDeletionBound = 'true';

  form.addEventListener('click', (event) => {
    const target = event.target;
    const button = target && target.closest ? target.closest('.delete-image-btn') : null;
    if (!button) return;

    event.preventDefault();
    const container = button.closest('[data-delete-image]');
    if (!(container instanceof HTMLElement)) return;

    const fieldName = container.getAttribute('data-delete-image');
    if (!fieldName) return;

    const fileInput = form.querySelector(`[data-prop-file="${fieldName}"]`);
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = '';
      fileInput.removeAttribute('data-webp-bg-token');
      fileInput.removeAttribute('data-webp-preoptimized');
    }

    dispatch({
      type: 'SINGLE_IMAGE_REMOVED',
      prop: fieldName,
    });

    form.dispatchEvent(
      new CustomEvent('kc:action-form-modified', { bubbles: true }),
    );
  });
});
