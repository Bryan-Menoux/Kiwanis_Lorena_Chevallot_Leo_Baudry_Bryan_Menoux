import { SINGLE_IMAGE_FIELDS, getStateSnapshot } from './state.js';

function syncFormDataFromState(formData) {
  const snapshot = getStateSnapshot();

  SINGLE_IMAGE_FIELDS.forEach((prop) => {
    formData.delete(prop);
    const file = snapshot.singleImageFiles[prop];
    if (file instanceof File) {
      formData.append(prop, file);
      return;
    }

    formData.delete(`remove_${prop}`);
    if (snapshot.singleImageRemoved[prop]) {
      formData.append(`remove_${prop}`, '1');
    }
  });

  formData.delete('galerie_photos');
  snapshot.galleryFiles.forEach((file) => {
    if (file instanceof File) {
      formData.append('galerie_photos', file);
    }
  });

  formData.delete('remove_galerie_photos');
  if (snapshot.galleryRemovedUrls.length > 0) {
    formData.append(
      'remove_galerie_photos',
      JSON.stringify(snapshot.galleryRemovedUrls),
    );
  }

  return formData;
}

function installFormDataSerializer(form) {
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.previewSerializerBound === 'true') return;
  form.dataset.previewSerializerBound = 'true';

  form.addEventListener('formdata', (event) => {
    if (!event.formData) return;
    syncFormDataFromState(event.formData);
  });
}

export { installFormDataSerializer, syncFormDataFromState };
