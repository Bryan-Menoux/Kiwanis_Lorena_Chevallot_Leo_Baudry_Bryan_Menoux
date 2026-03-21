import { optimizeFileListForField, WEBP_PREOPTIMIZED_ATTR } from '../actionForm/convertToWebp.js';
import { dispatch } from './dispatcher.js';
import { normalizeProp, resetImageCropValue } from './state.js';

const WEBP_BG_TOKEN_ATTR = 'data-webp-bg-token';

function createAsyncToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function handleFileElement(inputElement) {
  if (!(inputElement instanceof HTMLInputElement)) return;

  const rawProp = inputElement.getAttribute('data-prop-file');
  const prop = normalizeProp(rawProp || '');
  if (!prop || prop === 'galerie_photos') return;

  const selectedFiles = inputElement.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  const file = selectedFiles[0];
  resetImageCropValue(prop);
  inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'false');

  const asyncToken = createAsyncToken();
  inputElement.setAttribute(WEBP_BG_TOKEN_ATTR, asyncToken);

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target?.result;
    dispatch({
      type: 'SINGLE_IMAGE_SELECTED',
      prop,
      file,
      dataUrl: typeof dataUrl === 'string' ? dataUrl : '',
    });

    dispatch({
      type: 'SINGLE_IMAGE_OPTIMIZATION_PROGRESS',
      prop,
      progress: 0,
      active: true,
    });

    void optimizeFileListForField([file], prop, undefined, (_, percent) => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
      dispatch({
        type: 'SINGLE_IMAGE_OPTIMIZATION_PROGRESS',
        prop,
        progress: percent,
        active: true,
      });
    }).then((optimizedFiles) => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;

      const optimizedFile = Array.isArray(optimizedFiles) ? optimizedFiles[0] : null;
      if (optimizedFile instanceof File) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(optimizedFile);
        inputElement.files = dataTransfer.files;
        inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'true');
        dispatch({
          type: 'SINGLE_IMAGE_FILE_REPLACED',
          prop,
          file: optimizedFile,
        });

        const form = document.getElementById('leftForm');
        if (form instanceof HTMLFormElement) {
          form.dispatchEvent(
            new CustomEvent('kc:action-form-modified', { bubbles: true }),
          );
        }
      }

      dispatch({
        type: 'SINGLE_IMAGE_OPTIMIZATION_PROGRESS',
        prop,
        progress: 100,
        active: false,
      });
    }).catch(() => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
      dispatch({
        type: 'SINGLE_IMAGE_OPTIMIZATION_PROGRESS',
        prop,
        progress: 100,
        active: false,
      });
    });
  };
  reader.readAsDataURL(file);
}

function bindExistingSingleRemoveButtons() {
  if (document.__existingRemoveBound) return;
  document.addEventListener('click', (event) => {
    const removeButton = event.target && event.target.closest
      ? event.target.closest('.existing-single-remove')
      : null;
    if (!removeButton) return;

    const prop = normalizeProp(removeButton.getAttribute('data-prop') || '');
    if (!prop) return;

    resetImageCropValue(prop);

    const fileInput = document.querySelector(`[data-prop-file="${prop}"]`);
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = '';
      fileInput.removeAttribute(WEBP_BG_TOKEN_ATTR);
      fileInput.removeAttribute(WEBP_PREOPTIMIZED_ATTR);
    }

    dispatch({
      type: 'SINGLE_IMAGE_REMOVED',
      prop,
    });
  });
  document.__existingRemoveBound = true;
}

export { handleFileElement, bindExistingSingleRemoveButtons };
