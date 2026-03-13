import {
  optimizeFileListForField,
  WEBP_PREOPTIMIZED_ATTR,
} from "./actionForm/convertToWebp.js";
import { showAlert } from "../utils/alerts";

function isImageFile(file) {
  return file instanceof File && typeof file.type === "string" && file.type.startsWith("image/");
}

function createToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createSelectedThumbnail(previewUrl, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "relative overflow-hidden rounded-md";
  wrapper.style.paddingBottom = "100%";

  const image = document.createElement("img");
  image.src = previewUrl;
  image.alt = "Miniature sélectionnée";
  image.className = "absolute inset-0 h-full w-full object-cover";
  image.loading = "lazy";
  image.decoding = "async";
  wrapper.appendChild(image);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className =
    "absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white";
  removeButton.setAttribute("data-gallery-selected-index", String(index));
  removeButton.setAttribute("aria-label", "Supprimer la photo");
  removeButton.title = "Supprimer la photo";
  removeButton.textContent = "\u2716";
  wrapper.appendChild(removeButton);

  return wrapper;
}

function createExistingThumbnail(photoUrl) {
  const wrapper = document.createElement("div");
  wrapper.className = "relative overflow-hidden rounded-md";
  wrapper.style.paddingBottom = "100%";

  const image = document.createElement("img");
  image.src = photoUrl;
  image.alt = "Miniature existante";
  image.className = "absolute inset-0 h-full w-full object-cover";
  image.loading = "lazy";
  image.decoding = "async";
  wrapper.appendChild(image);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className =
    "absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white";
  removeButton.setAttribute("data-gallery-remove-url", photoUrl);
  removeButton.setAttribute("aria-label", "Supprimer la photo");
  removeButton.title = "Supprimer la photo";
  removeButton.textContent = "\u2716";
  wrapper.appendChild(removeButton);

  return wrapper;
}

export function initGalleryField(config = {}) {
  const {
    fieldName = "photo",
    inputId = `input_${fieldName}`,
    existingContainerId = `${fieldName}Existing`,
    selectedContainerId = `${fieldName}Selected`,
    hiddenRemoveInputId = `hidden_remove_${fieldName}`,
    maxImages = 4,
    initialExistingUrls = [],
  } = config;

  const input = document.getElementById(inputId);
  const existingContainer = document.getElementById(existingContainerId);
  const selectedContainer = document.getElementById(selectedContainerId);
  const hiddenRemoveInput = document.getElementById(hiddenRemoveInputId);

  if (!(input instanceof HTMLInputElement)) return;
  if (!(existingContainer instanceof HTMLElement)) return;
  if (!(selectedContainer instanceof HTMLElement)) return;
  if (!(hiddenRemoveInput instanceof HTMLInputElement)) return;
  if (input.dataset.galleryFieldInit === "true") return;
  input.dataset.galleryFieldInit = "true";

  const state = {
    existingUrls: Array.isArray(initialExistingUrls)
      ? initialExistingUrls.filter((url) => typeof url === "string" && url.trim() !== "")
      : [],
    removedExistingUrls: [],
    selectedFiles: [],
    selectedPreviewUrls: [],
  };

  const syncInputFiles = () => {
    const transfer = new DataTransfer();
    state.selectedFiles.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  };

  const syncRemovedExistingUrls = () => {
    hiddenRemoveInput.value = state.removedExistingUrls.length
      ? JSON.stringify(state.removedExistingUrls)
      : "";
  };

  const renderExisting = () => {
    existingContainer.innerHTML = "";
    state.existingUrls.forEach((photoUrl) => {
      existingContainer.appendChild(createExistingThumbnail(photoUrl));
    });
  };

  const renderSelected = () => {
    selectedContainer.innerHTML = "";
    state.selectedPreviewUrls.forEach((previewUrl, index) => {
      selectedContainer.appendChild(createSelectedThumbnail(previewUrl, index));
    });
  };

  const replaceOptimizedFiles = (sourceFiles, optimizedFiles) => {
    if (!Array.isArray(sourceFiles) || !Array.isArray(optimizedFiles)) return;
    sourceFiles.forEach((sourceFile, index) => {
      const optimizedFile = optimizedFiles[index];
      if (!(optimizedFile instanceof File)) return;
      const stateIndex = state.selectedFiles.indexOf(sourceFile);
      if (stateIndex === -1) return;
      state.selectedFiles[stateIndex] = optimizedFile;
    });
    syncInputFiles();
  };

  const appendFiles = async (incomingFiles) => {
    const safeFiles = Array.isArray(incomingFiles) ? incomingFiles.filter(isImageFile) : [];
    if (!safeFiles.length) return;

    const remainingSlots =
      maxImages - state.existingUrls.length - state.selectedFiles.length;

    if (remainingSlots <= 0) {
      showAlert({
        type: "warning",
        message: `Vous avez déjà atteint la limite de ${maxImages} images pour cette galerie.`,
      });
      syncInputFiles();
      return;
    }

    const acceptedFiles = safeFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < safeFiles.length) {
      showAlert({
        type: "warning",
        message: `Seules ${acceptedFiles.length} image(s) ont été ajoutées. La galerie est limitée à ${maxImages} images au total.`,
      });
    }

    const previewUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
    state.selectedFiles.push(...acceptedFiles);
    state.selectedPreviewUrls.push(...previewUrls);
    renderSelected();
    syncInputFiles();

    input.setAttribute(WEBP_PREOPTIMIZED_ATTR, "false");
    const batchToken = createToken();
    input.dataset.galleryOptimizeToken = batchToken;

    try {
      const optimizedFiles = await optimizeFileListForField(
        acceptedFiles,
        fieldName,
      );
      if (input.dataset.galleryOptimizeToken !== batchToken) return;
      replaceOptimizedFiles(acceptedFiles, optimizedFiles);
      input.setAttribute(WEBP_PREOPTIMIZED_ATTR, "true");
    } catch {
      if (input.dataset.galleryOptimizeToken !== batchToken) return;
      input.setAttribute(WEBP_PREOPTIMIZED_ATTR, "true");
    }
  };

  input.addEventListener("change", () => {
    void appendFiles(Array.from(input.files || []));
  });

  selectedContainer.addEventListener("click", (event) => {
    const trigger =
      event.target instanceof Element
        ? event.target.closest("[data-gallery-selected-index]")
        : null;
    if (!(trigger instanceof HTMLElement)) return;

    const index = Number.parseInt(
      trigger.getAttribute("data-gallery-selected-index") || "",
      10,
    );
    if (!Number.isInteger(index) || index < 0 || index >= state.selectedFiles.length) {
      return;
    }

    const [removedPreviewUrl] = state.selectedPreviewUrls.splice(index, 1);
    state.selectedFiles.splice(index, 1);
    if (removedPreviewUrl) {
      URL.revokeObjectURL(removedPreviewUrl);
    }

    renderSelected();
    syncInputFiles();
  });

  existingContainer.addEventListener("click", (event) => {
    const trigger =
      event.target instanceof Element
        ? event.target.closest("[data-gallery-remove-url]")
        : null;
    if (!(trigger instanceof HTMLElement)) return;

    const photoUrl = trigger.getAttribute("data-gallery-remove-url") || "";
    if (!photoUrl) return;

    state.existingUrls = state.existingUrls.filter((url) => url !== photoUrl);
    if (!state.removedExistingUrls.includes(photoUrl)) {
      state.removedExistingUrls.push(photoUrl);
    }
    syncRemovedExistingUrls();
    renderExisting();
  });

  renderExisting();
  renderSelected();
  syncRemovedExistingUrls();
  syncInputFiles();
}
