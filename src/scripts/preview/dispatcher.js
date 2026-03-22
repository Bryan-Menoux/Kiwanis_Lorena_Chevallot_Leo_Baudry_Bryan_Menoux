import {
  renderAll,
  renderExistingThumbnails,
  renderField,
  renderFormGalleryThumbnails,
  renderGallery,
  renderGalleryThumbnailOptimizationProgress,
  renderSingleImageOptimizationProgress,
  renderSingleImagePreview,
} from './render.js';
import {
  addGalleryFiles,
  markSingleImageRemoved,
  normalizeProp,
  removeGalleryExistingUrl,
  removeGalleryItem,
  removeImage,
  setField,
  setGalleryDataUrls,
  setGalleryExistingUrls,
  setGalleryFiles,
  setGalleryOptimizationStates,
  setGalleryThumbnailOptimizationProgress,
  setPreviewState,
  setSingleImageFile,
  setSingleImageOptimizationProgress,
} from './state.js';

function renderSingleImageDependencies(prop) {
  if (!prop) return;
  renderField(prop);
  renderSingleImagePreview(prop);
}

function renderGalleryDependencies() {
  renderGallery();
  renderExistingThumbnails();
  renderFormGalleryThumbnails();
}

function dispatch(action) {
  if (!action || typeof action.type !== 'string') return;

  switch (action.type) {
    case 'INIT_STATE': {
      setPreviewState(action.value || {}, action.mode || 'create');
      renderAll();
      return;
    }

    case 'FIELD_CHANGED': {
      const prop = normalizeProp(action.prop);
      if (!prop) return;
      setField(prop, action.value);
      renderField(prop);
      if (prop === 'date_debut' || prop === 'date_fin') {
        renderField('dates');
      }
      return;
    }

    case 'SINGLE_IMAGE_SELECTED': {
      const prop = normalizeProp(action.prop);
      if (!prop) return;
      setSingleImageFile(prop, action.file || null);
      markSingleImageRemoved(prop, false);
      setField(prop, action.dataUrl || '');
      renderSingleImageDependencies(prop);
      return;
    }

    case 'SINGLE_IMAGE_REMOVED': {
      const prop = normalizeProp(action.prop);
      if (!prop) return;
      removeImage(prop);
      renderSingleImageDependencies(prop);
      return;
    }

    case 'SINGLE_IMAGE_FILE_REPLACED': {
      const prop = normalizeProp(action.prop);
      if (!prop) return;
      setSingleImageFile(prop, action.file || null);
      renderSingleImagePreview(prop);
      return;
    }

    case 'SINGLE_IMAGE_OPTIMIZATION_PROGRESS': {
      const prop = normalizeProp(action.prop);
      if (!prop) return;
      setSingleImageOptimizationProgress(prop, action.progress, action.active);
      renderSingleImageOptimizationProgress(prop);
      return;
    }

    case 'GALLERY_FILES_ADDED': {
      addGalleryFiles(action.files || []);
      if (Array.isArray(action.dataUrls)) {
        setGalleryDataUrls(action.dataUrls);
      }
      renderGalleryDependencies();
      return;
    }

    case 'GALLERY_FILES_REPLACED': {
      setGalleryFiles(action.files || []);
      renderFormGalleryThumbnails();
      return;
    }

    case 'GALLERY_DATA_URLS_SET': {
      setGalleryDataUrls(action.dataUrls || []);
      renderGalleryDependencies();
      return;
    }

    case 'GALLERY_EXISTING_URLS_SET': {
      setGalleryExistingUrls(action.urls || []);
      renderGalleryDependencies();
      return;
    }

    case 'GALLERY_EXISTING_REMOVED': {
      removeGalleryExistingUrl(action.url || '');
      renderGalleryDependencies();
      return;
    }

    case 'GALLERY_ITEM_REMOVED': {
      removeGalleryItem(action.index);
      renderGalleryDependencies();
      return;
    }

    case 'GALLERY_OPTIMIZATION_PROGRESS': {
      setGalleryThumbnailOptimizationProgress(
        action.index,
        action.progress,
        action.active,
      );
      renderGalleryThumbnailOptimizationProgress(action.index);
      return;
    }

    case 'GALLERY_OPTIMIZATION_STATES_SET': {
      setGalleryOptimizationStates(action.value || []);
      renderFormGalleryThumbnails();
      return;
    }

    default:
      return;
  }
}

export { dispatch };
