// convertToWebp.js
// Client-side image processing before form submit.
// Goal:
// - Reduce upload payload, especially on mobile / slow connections.
// - Keep a higher budget for hero images, but still compress them on constrained networks.

const MAX_IMAGE_BYTES = 40 * 1024;
const MOBILE_MAX_IMAGE_BYTES = 32 * 1024;
const HERO_MAX_IMAGE_BYTES = 700 * 1024;
const HERO_MOBILE_MAX_IMAGE_BYTES = 280 * 1024;
const HERO_FIELD_NAME = "hero";
const WEBP_PROCESSING_ATTR = "data-webp-processing";
const KEEP_OVERLAY_VISIBLE_ATTR = "data-submit-overlay-keep-visible";
const SUBMITTER_PROXY_ATTR = "data-webp-submitter-proxy";
const WEBP_PROCESS_TIMEOUT_MS = 60000;
const SUBMIT_FAILURE_EVENT_NAME = "kc:submit-overlay-failed";

const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.16];
const SCALE_FACTOR = 0.8;
const MAX_DIMENSION = 1600;
const MOBILE_MAX_DIMENSION = 1200;
const HERO_MAX_DIMENSION = 2200;
const HERO_MOBILE_MAX_DIMENSION = 1400;

function toWebpName(fileName) {
  if (typeof fileName !== "string" || fileName.trim() === "") return "image.webp";
  if (fileName.includes(".")) return fileName.replace(/\.[^.]+$/, ".webp");
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
    canvas.toBlob(
      (blob) => resolve(blob || null),
      "image/webp",
      quality,
    );
  });
}

function getUploadProfile() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;
  const effectiveType =
    typeof connection?.effectiveType === "string"
      ? connection.effectiveType
      : "";
  const saveData = Boolean(connection?.saveData);
  const downlink = Number(connection?.downlink || 0);
  const isSlowNetwork =
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g";
  const isLowBandwidth = Number.isFinite(downlink) && downlink > 0 && downlink < 1.5;
  const isMobileViewport =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1023px)").matches;

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
    };
  }

  return {
    maxBytes: constrained ? MOBILE_MAX_IMAGE_BYTES : MAX_IMAGE_BYTES,
    maxDimension: constrained ? MOBILE_MAX_DIMENSION : MAX_DIMENSION,
  };
}

async function compressImageToMaxBytes(file, maxBytes, maxDimension) {
  if (!(file instanceof File)) return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;

  const loaded = await loadImageFromFile(file);
  if (!loaded || !loaded.width || !loaded.height) return file;

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
    while (true) {
      const targetWidth = Math.max(1, Math.round(loaded.width * scale));
      const targetHeight = Math.max(1, Math.round(loaded.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) break;

      context.drawImage(loaded.image, 0, 0, targetWidth, targetHeight);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToWebpBlob(canvas, quality);
        if (!blob) continue;

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= maxBytes) {
          return new File([blob], outputName, { type: "image/webp" });
        }
      }

      if (targetWidth === 1 && targetHeight === 1) {
        break;
      }

      scale *= SCALE_FACTOR;
    }
  } finally {
    loaded.dispose();
  }

  if (bestBlob) {
    return new File([bestBlob], outputName, { type: "image/webp" });
  }

  return file;
}

async function processFileForField(file, fieldName, profile) {
  if (!(file instanceof File)) return file;
  if (!file.type.startsWith("image/")) return file;

  const budget = getFieldBudget(fieldName, profile);
  return compressImageToMaxBytes(file, budget.maxBytes, budget.maxDimension);
}

async function processInputFiles(input, profile) {
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.files || input.files.length === 0) return;

  const fieldName =
    (input.getAttribute("data-prop-file") || input.name || "").trim();

  const processedFiles = await Promise.all(
    Array.from(input.files).map((file) =>
      processFileForField(file, fieldName, profile),
    ),
  );

  const dataTransfer = new DataTransfer();
  processedFiles.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
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

function clearSubmitterProxyInputs(form) {
  const existing = form.querySelectorAll(`input[${SUBMITTER_PROXY_ATTR}="true"]`);
  existing.forEach((node) => node.remove());
}

function appendSubmitterProxyInput(form, submitter) {
  if (
    !(
      submitter instanceof HTMLButtonElement ||
      submitter instanceof HTMLInputElement
    )
  ) {
    return;
  }
  const submitterName = (submitter.name || "").trim();
  if (!submitterName) return;

  const submitterValue = submitter.value ?? "";
  const proxy = document.createElement("input");
  proxy.type = "hidden";
  proxy.name = submitterName;
  proxy.value = String(submitterValue);
  proxy.setAttribute(SUBMITTER_PROXY_ATTR, "true");
  form.appendChild(proxy);
}

function notifySubmitFailure(form, message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUBMIT_FAILURE_EVENT_NAME, {
      detail: {
        form,
        formSelector: form.id ? `#${form.id}` : "",
        message,
      },
    }),
  );
}

export function initWebpConversion() {
  const form = document.getElementById("leftForm");
  if (!(form instanceof HTMLFormElement)) return;

  if (form.dataset.webpConversionInit === "true") return;
  form.dataset.webpConversionInit = "true";

  form.addEventListener("submit", async (event) => {
    if (event.defaultPrevented) {
      form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
      return;
    }

    if (form.getAttribute(WEBP_PROCESSING_ATTR) === "true") {
      const keepVisible = form.getAttribute(KEEP_OVERLAY_VISIBLE_ATTR) === "true";
      if (!keepVisible) {
        // Etat stale (ex: retour navigateur): on debloque puis on laisse filer.
        form.removeAttribute(WEBP_PROCESSING_ATTR);
      } else {
        // Une conversion est deja en cours: on garde l'overlay visible
        // et on evite de rejouer un second cycle de soumission.
        event.preventDefault();
        form.setAttribute(KEEP_OVERLAY_VISIBLE_ATTR, "true");
        return;
      }
    }

    form.setAttribute(WEBP_PROCESSING_ATTR, "true");
    form.setAttribute(KEEP_OVERLAY_VISIBLE_ATTR, "true");
    event.preventDefault();

    const submitter =
      event.submitter instanceof HTMLButtonElement ||
      event.submitter instanceof HTMLInputElement
        ? event.submitter
        : null;

    const fileInputs = Array.from(
      form.querySelectorAll('input[type="file"][data-prop-file]'),
    );
    const uploadProfile = getUploadProfile();
    let timeoutId = null;
    let reachedTimeout = false;

    try {
      const processingPromise = processInputsWithConcurrency(
        fileInputs,
        uploadProfile,
      ).then(() => "processed");
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
          reachedTimeout = true;
          resolve("timeout");
        }, WEBP_PROCESS_TIMEOUT_MS);
      });
      await Promise.race([processingPromise, timeoutPromise]);
      if (reachedTimeout) {
        console.warn(
          `[Image processing] Timeout after ${WEBP_PROCESS_TIMEOUT_MS}ms, submit continues with original files.`,
        );
      }
    } catch (error) {
      // Fallback: keep original files if processing fails unexpectedly.
      console.error("[Image processing] Unexpected error:", error);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }

    if (submitter?.name === "publish_action") {
      form.setAttribute("data-publish-confirmed", "true");
    }

    try {
      // Soumission native unique (sans `requestSubmit`) pour eviter
      // toute boucle "submit -> conversion -> requestSubmit -> submit".
      clearSubmitterProxyInputs(form);
      appendSubmitterProxyInput(form, submitter);
      HTMLFormElement.prototype.submit.call(form);
      return;
    } catch (error) {
      console.error("[Image processing] Native submit failed:", error);
      notifySubmitFailure(
        form,
        "Impossible d'envoyer le formulaire. Verifiez votre connexion puis reessayez.",
      );
    }
    form.removeAttribute(WEBP_PROCESSING_ATTR);
    form.removeAttribute(KEEP_OVERLAY_VISIBLE_ATTR);
  });
}
