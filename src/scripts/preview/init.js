import {
  previewState,
} from './state.js';
import { dispatch } from './dispatcher.js';
import { handleFileElement, bindExistingSingleRemoveButtons } from './singleImage.js';
import { handleGalleryFileElement, bindGalleryButtons } from './gallery.js';
import { installFormDataSerializer } from './serializer.js';

const selectOne = (selector, context = document) => context.querySelector(selector);

function safeParseJson(rawValue, fallbackValue = {}) {
  if (!rawValue || typeof rawValue !== 'string') return fallbackValue;
  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function readPlaceholderData(placeholderScript) {
  const fromWindow = typeof window !== 'undefined' ? window.__previewData : undefined;
  if (fromWindow && typeof fromWindow === 'object') return fromWindow;
  if (typeof fromWindow === 'string') return safeParseJson(fromWindow, {});
  if (placeholderScript) return safeParseJson(placeholderScript.textContent || '{}', {});
  return {};
}

function syncInitialFormValues(formElement) {
  if (!(formElement instanceof HTMLFormElement)) return;

  Array.from(formElement.querySelectorAll('[data-prop]')).forEach((fieldElement) => {
    const prop = fieldElement.getAttribute('data-prop');
    if (!prop || previewState[prop] === undefined) return;
    if (fieldElement instanceof HTMLInputElement && fieldElement.type === 'file') return;

    if (fieldElement instanceof HTMLSelectElement && fieldElement.multiple) {
      const values = Array.isArray(previewState[prop]) ? previewState[prop] : [];
      const selectedValues = new Set(values.map((value) => String(value)));
      Array.from(fieldElement.options).forEach((option) => {
        option.selected = selectedValues.has(option.value);
      });
      return;
    }

    if ('value' in fieldElement) {
      fieldElement.value = Array.isArray(previewState[prop])
        ? JSON.stringify(previewState[prop])
        : (previewState[prop] ?? '');
    }
  });
}

function handleInputElement(inputElement) {
  if (!inputElement) return;
  const prop = inputElement.getAttribute('data-prop');
  if (!prop) return;

  const isMultiSelect = inputElement instanceof HTMLSelectElement && inputElement.multiple;
  const maxSelect = isMultiSelect
    ? Number.parseInt(inputElement.dataset.maxSelect || '', 10)
    : NaN;
  const maxAllowed = Number.isFinite(maxSelect) && maxSelect > 0 ? maxSelect : Infinity;
  const rawValue = isMultiSelect
    ? Array.from(inputElement.selectedOptions)
      .map((option) => option.value)
      .filter((value) => String(value).trim() !== '')
    : (inputElement.value ?? '');

  if (isMultiSelect && prop === 'type_action' && rawValue.length > maxAllowed) {
    const keptValues = rawValue.slice(0, maxAllowed);
    const keptSet = new Set(keptValues);
    Array.from(inputElement.options).forEach((option) => {
      option.selected = keptSet.has(option.value);
    });
    rawValue.length = 0;
    keptValues.forEach((value) => rawValue.push(value));
  }

  const isEmpty = isMultiSelect
    ? rawValue.length === 0
    : String(rawValue).trim() === '';

  const previewValue = isMultiSelect ? rawValue : (isEmpty ? '' : rawValue);

  dispatch({
    type: 'FIELD_CHANGED',
    prop,
    value: previewValue,
  });
}

function initPreview() {
  const placeholderScript = selectOne('#previewData');
  const placeholder = readPlaceholderData(placeholderScript);
  const formElement = document.getElementById('leftForm');
  if (!(formElement instanceof HTMLFormElement)) return;
  const isEditMode = formElement.dataset.formMode === 'edit';

  dispatch({
    type: 'INIT_STATE',
    value: Object.assign({}, placeholder),
    mode: isEditMode ? 'edit' : 'create',
  });

  // En création, on garde les inputs vides et on laisse uniquement les placeholders HTML.
  // Le state initial sert à la preview, pas à préremplir le formulaire.
  if (isEditMode) {
    syncInitialFormValues(formElement);
  }

  installFormDataSerializer(formElement);
  bindExistingSingleRemoveButtons();
  bindGalleryButtons();

  if (formElement.dataset.previewBindingsBound === 'true') return;
  formElement.dataset.previewBindingsBound = 'true';

  formElement.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[data-prop]')) return;
    handleInputElement(target);
  });

  formElement.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('input[type="file"][data-prop-file]')) {
      const inputElement = target;
      const prop = inputElement.getAttribute('data-prop-file');
      if (!prop) return;
      if (prop === 'galerie_photos') {
        handleGalleryFileElement(inputElement);
        return;
      }
      handleFileElement(inputElement);
      return;
    }

    if (target.matches('[data-prop]')) {
      handleInputElement(target);
    }
  });

  formElement.addEventListener('submit', () => {
    // Le serializer branché sur `formdata` reconstruit le payload canonique.
    // Rien à faire ici, mais le listener existe pour garder le flux lisible.
  });
}

try {
  if (typeof window !== 'undefined') {
    window.__initPreview = initPreview;
  }
} catch (e) {}

export { initPreview, handleInputElement };
