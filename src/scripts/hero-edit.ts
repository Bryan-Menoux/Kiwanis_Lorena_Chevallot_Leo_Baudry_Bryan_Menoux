import { showAlert } from "../utils/alerts";
import {
  parseHeroCentrage,
  serializeHeroCentrage,
  type HeroCentrageMap,
  type HeroCropPoint,
  type HeroSupport,
} from "../utils/heroCentrage";

const SUPPORTS: HeroSupport[] = ["desktop", "tablet", "mobile"];

type HeroAxis = keyof HeroCropPoint;

type HeroState = {
  input: HTMLInputElement;
  centrageInput: HTMLInputElement;
  previewImages: Record<HeroSupport, HTMLImageElement | null>;
  previewMarkers: Record<HeroSupport, HTMLElement | null>;
  rangeXInputs: Record<HeroSupport, HTMLInputElement | null>;
  rangeYInputs: Record<HeroSupport, HTMLInputElement | null>;
  positionLabels: Record<HeroSupport, HTMLElement | null>;
  resetButtons: HTMLButtonElement[];
  currentObjectUrl: string;
  initialSrc: string;
  centrage: Record<HeroSupport, HeroCropPoint>;
};

function isHeroSupport(value: string): value is HeroSupport {
  return SUPPORTS.includes(value as HeroSupport);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizePoint(value: unknown): HeroCropPoint {
  const point = value as Partial<HeroCropPoint> | null | undefined;
  return {
    x: clamp(Number(point?.x) || 50, 0, 100),
    y: clamp(Number(point?.y) || 50, 0, 100),
  };
}

function parseCentrage(value: unknown): HeroCentrageMap {
  const parsed = parseHeroCentrage(value);
  const nextValue: HeroCentrageMap = {};

  SUPPORTS.forEach((support) => {
    const point = parsed[support];
    if (point) {
      nextValue[support] = normalizePoint(point);
    }
  });

  return nextValue;
}

function serializeCentrage(centrage: HeroCentrageMap): string {
  return JSON.stringify(serializeHeroCentrage(centrage));
}

function initializeHeroForm(form: Element): void {
  const input = form.querySelector("[data-hero-image-input]");
  const centrageInput = form.querySelector("[data-centrage-input]");

  if (
    !(input instanceof HTMLInputElement) ||
    !(centrageInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const previewImages: HeroState["previewImages"] = {
    desktop: form.querySelector('[data-preview-image="desktop"]'),
    tablet: form.querySelector('[data-preview-image="tablet"]'),
    mobile: form.querySelector('[data-preview-image="mobile"]'),
  };

  const previewMarkers: HeroState["previewMarkers"] = {
    desktop: form.querySelector('[data-preview-marker="desktop"]'),
    tablet: form.querySelector('[data-preview-marker="tablet"]'),
    mobile: form.querySelector('[data-preview-marker="mobile"]'),
  };

  const rangeXInputs: HeroState["rangeXInputs"] = {
    desktop: form.querySelector('[data-range-x="desktop"]'),
    tablet: form.querySelector('[data-range-x="tablet"]'),
    mobile: form.querySelector('[data-range-x="mobile"]'),
  };

  const rangeYInputs: HeroState["rangeYInputs"] = {
    desktop: form.querySelector('[data-range-y="desktop"]'),
    tablet: form.querySelector('[data-range-y="tablet"]'),
    mobile: form.querySelector('[data-range-y="mobile"]'),
  };

  const positionLabels: HeroState["positionLabels"] = {
    desktop: form.querySelector('[data-support-position="desktop"]'),
    tablet: form.querySelector('[data-support-position="tablet"]'),
    mobile: form.querySelector('[data-support-position="mobile"]'),
  };

  const resetButtons = Array.from(
    form.querySelectorAll<HTMLButtonElement>("[data-reset-support]"),
  );

  const state: HeroState = {
    input,
    centrageInput,
    previewImages,
    previewMarkers,
    rangeXInputs,
    rangeYInputs,
    positionLabels,
    resetButtons,
    currentObjectUrl: "",
    initialSrc:
      previewImages.desktop instanceof HTMLImageElement
        ? previewImages.desktop.src
        : "",
    centrage: {
      desktop: { x: 50, y: 50 },
      tablet: { x: 50, y: 50 },
      mobile: { x: 50, y: 50 },
      ...parseCentrage(centrageInput.value),
    },
  };

  function syncHiddenInput(): void {
    state.centrageInput.value = serializeCentrage(state.centrage);
  }

  function syncSupport(support: HeroSupport): void {
    const point = state.centrage[support];
    const objectPosition = `${point.x}% ${point.y}%`;
    const image = state.previewImages[support];
    const marker = state.previewMarkers[support];
    const rangeX = state.rangeXInputs[support];
    const rangeY = state.rangeYInputs[support];
    const label = state.positionLabels[support];

    if (image instanceof HTMLImageElement) {
      image.style.objectPosition = objectPosition;
    }
    if (marker instanceof HTMLElement) {
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
    }
    if (rangeX instanceof HTMLInputElement) {
      rangeX.value = `${point.x}`;
    }
    if (rangeY instanceof HTMLInputElement) {
      rangeY.value = `${point.y}`;
    }
    if (label instanceof HTMLElement) {
      label.textContent = `Centrage: ${Math.round(point.x)}% / ${Math.round(point.y)}%`;
    }
  }

  function syncAllSupports(): void {
    SUPPORTS.forEach((support) => {
      syncSupport(support);
    });
    syncHiddenInput();
  }

  function updateSupportPoint(
    support: HeroSupport,
    axis: HeroAxis,
    value: string,
  ): void {
    const nextPoint: HeroCropPoint = {
      ...state.centrage[support],
      [axis]: clamp(Number(value) || 50, 0, 100),
    };
    state.centrage[support] = nextPoint;
    syncSupport(support);
    syncHiddenInput();
  }

  function syncImageSource(source: string): void {
    const nextSource = source || state.initialSrc || "";
    SUPPORTS.forEach((support) => {
      const image = state.previewImages[support];
      if (image instanceof HTMLImageElement) {
        image.src = nextSource;
      }
    });
  }

  input.addEventListener("change", () => {
    const file = input.files?.item(0);

    if (state.currentObjectUrl) {
      URL.revokeObjectURL(state.currentObjectUrl);
      state.currentObjectUrl = "";
    }

    if (!file) {
      syncImageSource(state.initialSrc);
      return;
    }

    state.currentObjectUrl = URL.createObjectURL(file);
    syncImageSource(state.currentObjectUrl);
  });

  SUPPORTS.forEach((support) => {
    const rangeX = state.rangeXInputs[support];
    const rangeY = state.rangeYInputs[support];

    rangeX?.addEventListener("input", () => {
      updateSupportPoint(support, "x", rangeX.value);
    });

    rangeY?.addEventListener("input", () => {
      updateSupportPoint(support, "y", rangeY.value);
    });
  });

  state.resetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const support = button.dataset.resetSupport || "";
      if (!isHeroSupport(support)) return;
      state.centrage[support] = { x: 50, y: 50 };
      syncSupport(support);
      syncHiddenInput();
    });
  });

  syncAllSupports();
}

document.addEventListener("click", (event) => {
  const openButton =
    event.target instanceof HTMLElement
      ? event.target.closest("[data-open-hero-modal]")
      : null;
  if (openButton instanceof HTMLButtonElement) {
    const heroId = openButton.dataset.openHeroModal || "";
    const dialog = document.getElementById(`hero-modal-${heroId}`);
    if (dialog instanceof HTMLDialogElement) {
      dialog.showModal();
    }
    return;
  }

  const closeButton =
    event.target instanceof HTMLElement
      ? event.target.closest("[data-close-hero-modal]")
      : null;
  if (closeButton instanceof HTMLButtonElement) {
    const heroId = closeButton.dataset.closeHeroModal || "";
    const dialog = document.getElementById(`hero-modal-${heroId}`);
    if (dialog instanceof HTMLDialogElement) {
      dialog.close();
    }
  }
});

document
  .querySelectorAll("[data-hero-edit-form]")
  .forEach((form) => initializeHeroForm(form));

const successFlag = document.getElementById("hero-success-flag");
const errorFlag = document.getElementById("hero-error-flag");

if (successFlag instanceof HTMLElement) {
  const message = (successFlag.dataset.message || "").trim();
  if (message) {
    showAlert({ type: "success", message });
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    window.history.replaceState({}, "", url.toString());
  }
}

if (errorFlag instanceof HTMLElement) {
  const message = (errorFlag.dataset.message || "").trim();
  if (message) {
    showAlert({ type: "error", message });
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }
}
