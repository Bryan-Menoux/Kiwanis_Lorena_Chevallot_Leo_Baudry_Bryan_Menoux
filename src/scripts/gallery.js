let photoUrls = [];
let currentIndex = 0;

// Collecter les URLs des photos au chargement
document.addEventListener("DOMContentLoaded", function () {
  const photoElements = document.querySelectorAll("[data-photo-url]");
  photoUrls = Array.from(photoElements).map(
    (el) => el.dataset.photoUrl,
  );
});

function openModal(url) {
  currentIndex = photoUrls.indexOf(url);
  const modalImage = document.getElementById("modalImage");
  if (modalImage) modalImage.src = url;
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function showPrev() {
  currentIndex = (currentIndex - 1 + photoUrls.length) % photoUrls.length;
  const modalImage = document.getElementById("modalImage");
  if (modalImage) modalImage.src = photoUrls[currentIndex];
}

function showNext() {
  currentIndex = (currentIndex + 1) % photoUrls.length;
  const modalImage = document.getElementById("modalImage");
  if (modalImage) modalImage.src = photoUrls[currentIndex];
}

// Délégation d'événement pour les clics sur les photos
const photoGrid = document.getElementById("photoGrid");
if (photoGrid) {
  photoGrid.addEventListener("click", function (e) {
    const target = e.target.closest("[data-photo-url]");
    if (target) {
      openModal(target.dataset.photoUrl);
    }
  });
}

// Bouton de fermeture
const closeButton = document.getElementById("closeButton");
if (closeButton) {
  closeButton.addEventListener("click", function (e) {
    e.stopPropagation();
    closeModal();
  });
}

// Boutons de navigation
const prevButton = document.getElementById("prevButton");
if (prevButton) {
  prevButton.addEventListener("click", function (e) {
    e.stopPropagation();
    showPrev();
  });
}

const nextButton = document.getElementById("nextButton");
if (nextButton) {
  nextButton.addEventListener("click", function (e) {
    e.stopPropagation();
    showNext();
  });
}

// Fermer le modal en cliquant en dehors
const imageModal = document.getElementById("imageModal");
if (imageModal) {
  imageModal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });
}

function setGridStyles() {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;
  const count = parseInt(grid.dataset.photoCount || "0");
  const imgs = grid.querySelectorAll('img');
  const orientations = Array.from(imgs).map(img => {
    return img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape';
  });
  const divs = grid.querySelectorAll('.relative');

  if (window.innerWidth >= 768) {
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gridTemplateRows = count <= 2 ? "1fr" : "1fr 1fr";
    let areas = [];
    let template = "";
    if (count === 1) {
      areas = ["a"];
      template = '"a"';
    } else if (count === 2) {
      areas = ["a", "b"];
      template = '"a b"';
    } else if (count === 3) {
      const portraitIndex = orientations.findIndex(o => o === 'portrait');
      if (portraitIndex !== -1) {
        areas = new Array(3);
        areas[portraitIndex] = 'c';
        let letterIdx = 0;
        for (let i = 0; i < 3; i++) {
          if (i !== portraitIndex) {
            areas[i] = String.fromCharCode(97 + letterIdx++);
          }
        }
      } else {
        areas = ['a', 'b', 'c'];
      }
      template = '"a c" "b c"';
    } else if (count === 4) {
      areas = ["a", "b", "c", "d"];
      template = '"a b" "c d"';
    }
    grid.style.gridTemplateAreas = template;
    divs.forEach((div, i) => {
      div.style.gridArea = areas[i];
    });
  } else {
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gridTemplateRows = `repeat(${count}, 1fr)`;
    const areas = Array.from(
      { length: count },
      (_, i) => String.fromCharCode(97 + i),
    );
    const template = areas.map(a => `"${a}"`).join(" ");
    grid.style.gridTemplateAreas = template;
    divs.forEach((div, i) => {
      div.style.gridArea = areas[i];
    });
  }
}

document.addEventListener("DOMContentLoaded", setGridStyles);
window.addEventListener("resize", setGridStyles);