(() => {
  const globalWindow = window as Window & { __kcGalleryDisplayBound?: boolean };
  if (globalWindow.__kcGalleryDisplayBound) return;
  globalWindow.__kcGalleryDisplayBound = true;

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  const imgs = Array.from(grid.querySelectorAll('img')) as HTMLImageElement[];

  let stylesPoll: number | null = null;

  const tryApply = () => {
    if (
      typeof (window as any) === "undefined" ||
      typeof (window as any).setGridStyles !== "function"
    ) {
      return false;
    }
    try {
      (window as any).setGridStyles();
    } catch (error) {}
    return true;
  };

  const ensureGridStyles = () => {
    if (tryApply()) {
      if (stylesPoll !== null) {
        window.clearInterval(stylesPoll);
        stylesPoll = null;
      }
      return;
    }
    if (stylesPoll !== null) return;

    let attempts = 0;
    stylesPoll = window.setInterval(() => {
      attempts += 1;
      if (tryApply() || attempts > 40) {
        if (stylesPoll !== null) {
          window.clearInterval(stylesPoll);
          stylesPoll = null;
        }
      }
    }, 50);
  };

  // Afficher la galerie tout de suite pour éviter de bloquer le lazy loading natif.
  grid.classList.remove("opacity-0");
  ensureGridStyles();

  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth) return;
    const onStateChange = () => ensureGridStyles();
    img.addEventListener("load", onStateChange, { once: true });
    img.addEventListener("error", onStateChange, { once: true });
  });
});

// Logique de la modale
(() => {
  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage") as HTMLImageElement | null;
  const closeButton = document.getElementById("closeButton");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  let currentIndex = 0;
  let photoUrls: string[] = [];

  function getPhotoUrls() {
    const grid = document.getElementById("photoGrid");
    if (!grid) return [] as string[];
    return Array.from(grid.querySelectorAll("[data-photo-url]"))
      .map((el) => el.getAttribute("data-photo-url") || "")
      .filter((url) => url.trim() !== "");
  }

  let previousBodyOverflow: string | undefined;
  let previousHtmlOverflow: string | undefined;
  let previousBodyPosition: string | undefined;
  let previousBodyTop: string | undefined;
  let previousBodyWidth: string | undefined;
  let lockedScrollY = 0;
  let isScrollLocked = false;

  (window as any).openModal = (url: string) => {
    photoUrls = getPhotoUrls();
    currentIndex = photoUrls.indexOf(url);
    if (currentIndex === -1) currentIndex = 0;
    if (!modal || !modalImage) return;
    modalImage.src = url;
    if (!isScrollLocked) {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyPosition = document.body.style.position;
      previousBodyTop = document.body.style.top;
      previousBodyWidth = document.body.style.width;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `${-lockedScrollY}px`;
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
      isScrollLocked = true;
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  };

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    if (modalImage) modalImage.src = "";
    if (isScrollLocked) {
      document.body.style.overflow = previousBodyOverflow ?? "";
      document.body.style.position = previousBodyPosition ?? "";
      document.body.style.top = previousBodyTop ?? "";
      document.body.style.width = previousBodyWidth ?? "";
      document.documentElement.style.overflow = previousHtmlOverflow ?? "";
      previousBodyOverflow = undefined;
      previousHtmlOverflow = undefined;
      previousBodyPosition = undefined;
      previousBodyTop = undefined;
      previousBodyWidth = undefined;
      isScrollLocked = false;
      window.scrollTo(0, lockedScrollY);
    }
  }

  function showIndex(index: number) {
    photoUrls = getPhotoUrls();
    if (!photoUrls.length || !modalImage) return;
    currentIndex = (index + photoUrls.length) % photoUrls.length;
    modalImage.src = photoUrls[currentIndex];
  }

  if (closeButton) closeButton.addEventListener("click", closeModal);
  if (prevButton) prevButton.addEventListener("click", () => showIndex(currentIndex - 1));
  if (nextButton) nextButton.addEventListener("click", () => showIndex(currentIndex + 1));
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      closeModal();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      showIndex(currentIndex - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      showIndex(currentIndex + 1);
    }
  });
})();

})();
