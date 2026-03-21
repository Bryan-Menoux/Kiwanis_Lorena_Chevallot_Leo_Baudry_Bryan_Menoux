import { isDataUrl } from '../../utils/utilitaires.js';
import {
  isWebpFile,
  optimizeFileListForField,
  WEBP_PREOPTIMIZED_ATTR,
} from '../actionForm/convertToWebp.js';
import { dispatch } from './dispatcher.js';
import { galleryExistingUrls, galleryFiles, getStateSnapshot, normalizeProp } from './state.js';

const WEBP_BG_TOKEN_ATTR = 'data-webp-bg-token';

function createAsyncToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFilesAsDataUrls(files) {
  const safeFiles = Array.isArray(files) ? files.filter((file) => file instanceof File) : [];
  return Promise.all(
    safeFiles.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result || '');
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function syncGalleryFileInput() {
  const inputElement = document.getElementById('input_galerie_photos');
  if (!(inputElement instanceof HTMLInputElement)) return;

  const snapshot = getStateSnapshot();
  const dt = new DataTransfer();
  snapshot.galleryFiles.forEach((file) => {
    if (file instanceof File) {
      dt.items.add(file);
    }
  });
  inputElement.files = dt.files;
}

function handleGalleryFileElement(inputElement) {
  if (!(inputElement instanceof HTMLInputElement)) return;

  const rawProp = inputElement.getAttribute('data-prop-file');
  const prop = normalizeProp(rawProp || '');
  if (prop !== 'galerie_photos') return;

  const selectedFiles = inputElement.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  const existingCount = Array.isArray(galleryExistingUrls)
    ? galleryExistingUrls.length
    : 0;
  const remainingSlots = Math.max(0, 8 - existingCount - galleryFiles.length);
  if (remainingSlots === 0) return;

  const newFiles = Array.from(selectedFiles).slice(0, remainingSlots);
  if (!newFiles.length) return;

  inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'false');
  const asyncToken = createAsyncToken();
  inputElement.setAttribute(WEBP_BG_TOKEN_ATTR, asyncToken);

  void readFilesAsDataUrls(newFiles).then((newDataUrls) => {
    if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;

    dispatch({
      type: 'GALLERY_FILES_ADDED',
      files: newFiles,
      dataUrls: newDataUrls,
    });
    syncGalleryFileInput();
    const startIndex = getStateSnapshot().galleryFiles.length - newFiles.length;

    newFiles.forEach((_, index) => {
      dispatch({
        type: 'GALLERY_OPTIMIZATION_PROGRESS',
        index: startIndex + index,
        progress: 0,
        active: true,
      });
    });

    void optimizeFileListForField(newFiles, prop, undefined, (fileIndex, percent) => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
      dispatch({
        type: 'GALLERY_OPTIMIZATION_PROGRESS',
        index: startIndex + fileIndex,
        progress: percent,
        active: true,
      });
    }).then((optimizedFiles) => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
      if (!Array.isArray(optimizedFiles) || optimizedFiles.length === 0) {
        newFiles.forEach((_, index) => {
          dispatch({
            type: 'GALLERY_OPTIMIZATION_PROGRESS',
            index: startIndex + index,
            progress: 100,
            active: false,
          });
        });
        return;
      }

      const replacementMap = new Map();
      newFiles.forEach((originalFile, index) => {
        const optimizedFile = optimizedFiles[index];
        if (!(optimizedFile instanceof File) || optimizedFile === originalFile) return;
        replacementMap.set(originalFile, optimizedFile);
      });

      const updatedGalleryFiles = getStateSnapshot().galleryFiles.map((existingFile) =>
        replacementMap.get(existingFile) || existingFile,
      );

      dispatch({
        type: 'GALLERY_FILES_REPLACED',
        files: updatedGalleryFiles,
      });
      syncGalleryFileInput();
      const form = document.getElementById('leftForm');
      if (form instanceof HTMLFormElement) {
        form.dispatchEvent(
          new CustomEvent('kc:action-form-modified', { bubbles: true }),
        );
      }

      newFiles.forEach((_, index) => {
        dispatch({
          type: 'GALLERY_OPTIMIZATION_PROGRESS',
          index: startIndex + index,
          progress: 100,
          active: false,
        });
      });
      inputElement.setAttribute(
        WEBP_PREOPTIMIZED_ATTR,
        optimizedFiles.every((file) => isWebpFile(file)) ? 'true' : 'false',
      );
    }).catch(() => {
      if (inputElement.getAttribute(WEBP_BG_TOKEN_ATTR) !== asyncToken) return;
      newFiles.forEach((_, index) => {
        dispatch({
          type: 'GALLERY_OPTIMIZATION_PROGRESS',
          index: startIndex + index,
          progress: 100,
          active: false,
        });
      });
      inputElement.setAttribute(WEBP_PREOPTIMIZED_ATTR, 'false');
    });
  });
}

function bindGalleryButtons() {
  if (document.__galleryButtonsBound) return;

  document.addEventListener('click', (event) => {
    const target = event.target;
    const selectedRemoveButton =
      target && target.closest ? target.closest('[data-gallery-index]') : null;
    if (selectedRemoveButton) {
      event.preventDefault();
      const removeIndex = Number.parseInt(
        selectedRemoveButton.getAttribute('data-gallery-index') || '',
        10,
      );
      if (!Number.isInteger(removeIndex)) return;

      dispatch({
        type: 'GALLERY_ITEM_REMOVED',
        index: removeIndex,
      });
      syncGalleryFileInput();
      const form = document.getElementById('leftForm');
      if (form instanceof HTMLFormElement) {
        form.dispatchEvent(
          new CustomEvent('kc:action-form-modified', { bubbles: true }),
        );
      }
      return;
    }

    const existingRemoveButton =
      target && target.closest ? target.closest('[data-remove-url]') : null;
    if (!existingRemoveButton) return;

    event.preventDefault();
    const photoUrl = existingRemoveButton.getAttribute('data-remove-url');
    if (!photoUrl || isDataUrl(photoUrl)) return;

    dispatch({
      type: 'GALLERY_EXISTING_REMOVED',
      url: photoUrl,
    });
    const form = document.getElementById('leftForm');
    if (form instanceof HTMLFormElement) {
      form.dispatchEvent(
        new CustomEvent('kc:action-form-modified', { bubbles: true }),
      );
    }
  });

  document.__galleryButtonsBound = true;
}

export { handleGalleryFileElement, bindGalleryButtons };
