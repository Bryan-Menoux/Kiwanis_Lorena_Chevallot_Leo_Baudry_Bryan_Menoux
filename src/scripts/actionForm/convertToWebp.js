import { setGalleryFiles, setSingleImageFile } from '../preview/state.js';

// Client-side image processing for file inputs and final submit fallback.
const MAX_IMAGE_BYTES = 40 * 1024;
const MOBILE_MAX_IMAGE_BYTES = 32 * 1024;
const HERO_MAX_IMAGE_BYTES = 700 * 1024;
const HERO_MOBILE_MAX_IMAGE_BYTES = 280 * 1024;
const HERO_FIELD_NAME = 'hero';
const WEBP_PROCESSING_ATTR = 'data-webp-processing';
const KEEP_OVERLAY_VISIBLE_ATTR = 'data-submit-overlay-keep-visible';
export const WEBP_PREOPTIMIZED_ATTR = 'data-webp-preoptimized';
const WEBP_PROCESS_TIMEOUT_MS = 60000;
const SUBMIT_FAILURE_EVENT_NAME = 'kc:submit-overlay-failed';

const QUALITY_STEPS = [0.86, 0.74, 0.62, 0.5, 0.38];
const SCALE_FACTOR = 0.8;
const MAX_DIMENSION = 1600;
const MOBILE_MAX_DIMENSION = 1200;
const HERO_MAX_DIMENSION = 2200;
const HERO_MOBILE_MAX_DIMENSION = 1400;
const MAX_SCALE_PASSES = 4;
const CONSTRAINED_MAX_SCALE_PASSES = 3;
const MAX_FILE_PROCESS_MS = 5000;
const CONSTRAINED_MAX_FILE_PROCESS_MS = 2500;

function isWebpFile(file) {
  if (!(file instanceof File)) return false;
  const type = String(file.type || "").trim().toLowerCase();
  if (type === "image/webp") return true;
  const name = String(file.name || "").trim().toLowerCase();
  return name.endsWith(".webp");
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function toWebpName(fileName) {
  if (typeof fileName !== 'string' || fileName.trim() === '') return 'image.webp';
  if (fileName.includes('.')) return fileName.replace(/\.[^.]+$/, '.webp');
  return `${fileName}.webp`;
}

function loadImageFromFile(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        dispose: () => URL.revokeObjectURL(objectUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

function canvasToWebpBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), 'image/webp', quality);
  });
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function notifyProgress(onProgress, value) {
  if (typeof onProgress !== 'function') return;
  onProgress(clampPercent(value));
}

function getUploadProfile() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;
  const effectiveType =
    typeof connection?.effectiveType === 'string' ? connection.effectiveType : '';
  const saveData = Boolean(connection?.saveData);
  const downlink = Number(connection?.downlink || 0);
  const isSlowNetwork =
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g';
  const isLowBandwidth = Number.isFinite(downlink) && downlink > 0 && downlink < 1.5;
  const isMobileViewport =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 1023px)').matches;

  return {
    isConstrained: isMobileViewport || saveData || isSlowNetwork || isLowBandwidth,
  };
}

function getFieldBudget(fieldName, profile) {
  const isHero = fieldName === HERO_FIELD_NAME;
  const constrained = Boolean(profile?.isConstrained);

  if (isHero) {
    return {
      maxBytes: constrained ? HERO_MOBILE_MAX_IMAGE_BYTES : HERO_MAX_IMAGE_BYTES,
      maxDimension: constrained ? HERO_MOBILE_MAX_DIMENSION : HERO_MAX_DIMENSION,
      maxScalePasses: constrained ? CONSTRAINED_MAX_SCALE_PASSES : MAX_SCALE_PASSES,
      maxProcessMs: constrained ? CONSTRAINED_MAX_FILE_PROCESS_MS : MAX_FILE_PROCESS_MS,
    };
  }

  return {
    maxBytes: constrained ? MOBILE_MAX_IMAGE_BYTES : MAX_IMAGE_BYTES,
    maxDimension: constrained ? MOBILE_MAX_DIMENSION : MAX_DIMENSION,
    maxScalePasses: constrained ? CONSTRAINED_MAX_SCALE_PASSES : MAX_SCALE_PASSES,
    maxProcessMs: constrained ? CONSTRAINED_MAX_FILE_PROCESS_MS : MAX_FILE_PROCESS_MS,
  };
}

async function compressImageToMaxBytes(
  file,
  {
    maxBytes,
    maxDimension,
    maxScalePasses = MAX_SCALE_PASSES,
    maxProcessMs = MAX_FILE_PROCESS_MS,
  },
  onProgress,
) {
  if (!(file instanceof File)) return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= maxBytes && isWebpFile(file)) {
    notifyProgress(onProgress, 100);
    return file;
  }

  notifyProgress(onProgress, 6);

  const loaded = await loadImageFromFile(file);
  if (!loaded || !loaded.width || !loaded.height) {
    notifyProgress(onProgress, 100);
    return file;
  }
  notifyProgress(onProgress, 12);

  const outputName = toWebpName(file.name);
  let bestBlob = null;
  let scale = 1;

  if (Number.isFinite(maxDimension) && maxDimension > 0) {
    const largestSide = Math.max(loaded.width, loaded.height);
    if (largestSide > maxDimension) {
      scale = maxDimension / largestSide;
    }
  }

  try {
    const startedAt = nowMs();
    let passIndex = 0;
    const totalIterations = Math.max(1, maxScalePasses * QUALITY_STEPS.length);
    let completedIterations = 0;

    while (passIndex < maxScalePasses) {
      if (nowMs() - startedAt > maxProcessMs) break;

      const targetWidth = Math.max(1, Math.round(loaded.width * scale));
      const targetHeight = Math.max(1, Math.round(loaded.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) break;

      context.drawImage(loaded.image, 0, 0, targetWidth, targetHeight);

      for (const quality of QUALITY_STEPS) {
        if (nowMs() - startedAt > maxProcessMs) break;

        const blob = await canvasToWebpBlob(canvas, quality);
        if (!blob) continue;

        completedIterations += 1;
        const sweepProgress = 12 + (completedIterations / totalIterations) * 83;
        notifyProgress(onProgress, Math.min(95, sweepProgress));

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= maxBytes) {
          notifyProgress(onProgress, 100);
          return new File([blob], outputName, { type: 'image/webp' });
        }
      }

      if (targetWidth === 1 && targetHeight === 1) break;
      scale *= SCALE_FACTOR;
      passIndex += 1;
    }
  } finally {
    loaded.dispose();
  }

  if (bestBlob) {
    notifyProgress(onProgress, 100);
    return new File([bestBlob], outputName, { type: 'image/webp' });
  }

  notifyProgress(onProgress, 100);
  return file;
}

async function processFileForField(file, fieldName, profile, onProgress) {
  if (!(file instanceof File)) return file;
  if (!file.type.startsWith('image/')) return file;
  const budget = getFieldBudget(fieldName, profile);
  return compressImageToMaxBytes(file, budget, onProgress);
}

export async function optimizeFileListForField(
  files,
  fieldName,
  profile,
  onFileProgress,
) {
  const safeFiles = Array.isArray(files) ? files : [];
  if (!safeFiles.length) return [];

  const resolvedProfile = profile || getUploadProfile();
  return Promise.all(
    safeFiles.map(async (file, fileIndex) => {
      const reportProgress = (percent) => {
        if (typeof onFileProgress !== 'function') return;
        onFileProgress(fileIndex, clampPercent(percent));
      };
      reportProgress(0);
      try {
        const optimizedFile = await processFileForField(
          file,
          fieldName,
          resolvedProfile,
          reportProgress,
        );
        reportProgress(100);
        return optimizedFile;
      } catch (error) {
        console.debug(error);
        reportProgress(100);
        return file;
      }
    }),
  );
}

async function processInputFiles(input, profile) {
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.files || input.files.length === 0) return;
  if (input.getAttribute(WEBP_PREOPTIMIZED_ATTR) === 'true') return;

  const fieldName = (input.getAttribute('data-prop-file') || input.name || '').trim();
  const processedFiles = await optimizeFileListForField(
    Array.from(input.files),
    fieldName,
    profile,
  );

  const dataTransfer = new DataTransfer();
  processedFiles.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
  const allFilesAreWebp =
    processedFiles.length > 0 && processedFiles.every((file) => isWebpFile(file));
  input.setAttribute(WEBP_PREOPTIMIZED_ATTR, allFilesAreWebp ? 'true' : 'false');

  if (fieldName === 'galerie_photos') {
    setGalleryFiles(Array.from(input.files));
  } else if (fieldName) {
    setSingleImageFile(fieldName, input.files[0] || null);
  }
}

async function processInputsWithConcurrency(inputs, profile) {
  const safeInputs = Array.isArray(inputs) ? inputs : [];
  if (!safeInputs.length) return;

  const concurrency = profile?.isConstrained ? 1 : 2;
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, safeInputs.length) }).map(
    async () => {
      while (index < safeInputs.length) {
        const currentIndex = index;
        index += 1;
        const input = safeInputs[currentIndex];
        await processInputFiles(input, profile);
      }
    },
  );
  await Promise.all(workers);
}

function notifySubmitFailure(form, message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SUBMIT_FAILURE_EVENT_NAME, {
      detail: {
        form,
        formSelector: form.id ? `#${form.id}` : '',
        message,
      },
    }),
  );
}

function getFileInputsRequiringProcessing(form) {
  if (!(form instanceof HTMLFormElement)) return [];

  return Array.from(form.querySelectorAll('input[type="file"][data-prop-file]')).filter(
    (input) =>
      input instanceof HTMLInputElement &&
      input.files instanceof FileList &&
      input.files.length > 0 &&
      (
        input.getAttribute(WEBP_PREOPTIMIZED_ATTR) !== 'true' ||
        Array.from(input.files).some(
          (file) => file instanceof File && file.type.startsWith('image/') && !isWebpFile(file),
        )
      ),
  );
}

export function initWebpConversion() {
  const form = document.getElementById('leftForm');
  if (!(form instanceof HTMLFormElement)) return;

  if (form.dataset.webpConversionInit === 'true') return;
  form.dataset.webpConversionInit = 'true';

  form.addEventListener('submit', async (event) => {
    if (form.getAttribute('data-webp-submit-ready') === 'true') {
      form.removeAttribute('data-webp-submit-ready');
      form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
      return;
    }

    if (event.defaultPrevented) {
      form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
      return;
    }

    const fileInputs = getFileInputsRequiringProcessing(form);
    if (fileInputs.length === 0) {
      form.removeAttribute(WEBP_PROCESSING_ATTR);
      form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
      return;
    }

    if (form.getAttribute(WEBP_PROCESSING_ATTR) === 'true') {
      if (form.getAttribute(KEEP_OVERLAY_VISIBLE_ATTR) === 'true') {
        event.preventDefault();
        return;
      }
      form.removeAttribute(WEBP_PROCESSING_ATTR);
    }

    form.setAttribute(WEBP_PROCESSING_ATTR, 'true');
    form.setAttribute(KEEP_OVERLAY_VISIBLE_ATTR, 'true');
    event.preventDefault();

    const submitter =
      event.submitter instanceof HTMLButtonElement ||
      event.submitter instanceof HTMLInputElement
        ? event.submitter
        : null;

    const uploadProfile = getUploadProfile();
    let timeoutId = null;
    let reachedTimeout = false;

    try {
      const processingPromise = processInputsWithConcurrency(fileInputs, uploadProfile).then(
        () => 'processed',
      );
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
          reachedTimeout = true;
          resolve('timeout');
        }, WEBP_PROCESS_TIMEOUT_MS);
      });
      await Promise.race([processingPromise, timeoutPromise]);
      if (reachedTimeout) {
        console.warn(
          `[Traitement image] Délai dépassé après ${WEBP_PROCESS_TIMEOUT_MS} ms, l'envoi continue avec les fichiers d'origine.`,
        );
      }
    } catch (error) {
      console.error('[Traitement image] Erreur inattendue :', error);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }

    if (submitter?.name === 'publish_action') {
      form.setAttribute('data-publish-confirmed', 'true');
    }

    try {
      form.removeAttribute(WEBP_PROCESSING_ATTR);
      form.setAttribute('data-webp-submit-ready', 'true');
      queueMicrotask(() => {
        try {
          if (
            submitter instanceof HTMLButtonElement ||
            submitter instanceof HTMLInputElement
          ) {
            form.requestSubmit(submitter);
          } else {
            form.requestSubmit();
          }
        } catch (error) {
          console.error('[Traitement image] Échec de requestSubmit :', error);
          form.removeAttribute('data-webp-submit-ready');
          notifySubmitFailure(
            form,
            "Impossible d'envoyer le formulaire. Vérifiez votre connexion puis réessayez.",
          );
        }
      });
      return;
    } catch (error) {
      console.error('[Traitement image] Échec de requestSubmit :', error);
      form.removeAttribute('data-webp-submit-ready');
      notifySubmitFailure(
        form,
        "Impossible d'envoyer le formulaire. Vérifiez votre connexion puis réessayez.",
      );
    }

    form.removeAttribute(WEBP_PROCESSING_ATTR);
    form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
  });
}

export { isWebpFile };
