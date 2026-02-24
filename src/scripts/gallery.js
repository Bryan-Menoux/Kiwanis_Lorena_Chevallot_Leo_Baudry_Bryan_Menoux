/*
 * gallery.js
 * Single, stable implementation of setGridStyles() for photo grids.
 * - Removes duplicate/legacy layout logic
 * - Uses naturalWidth/naturalHeight after load (no decode())
 * - Implements exact templates for 1..8 items on desktop
 */
(function () {
  function letter(i) {
    return String.fromCharCode(97 + i);
  }

  function setGridStyles() {
    const grid = document.getElementById('photoGrid');
    if (!grid) return;

    const count = Math.max(0, parseInt(grid.dataset.photoCount || '0', 10) || 0);
    // Only consider direct children that represent gallery items (have data-photo-url)
    const items = Array.from(grid.children).filter((c) => c instanceof HTMLElement && c.hasAttribute && c.hasAttribute('data-photo-url'));
    const imgs = Array.from(grid.querySelectorAll('img'));

    // Clean inline styles before recalculating
    grid.style.gridTemplateColumns = '';
    grid.style.gridTemplateRows = '';
    grid.style.gridTemplateAreas = '';
    grid.style.gridAutoRows = 'auto';
    items.forEach((it) => {
      it.style.gridArea = '';
      it.style.height = '';
      const img = it.querySelector('img');
      if (img) { img.style.height = ''; img.style.width = ''; }
    });

    // Mobile: single column stack
    if (window.innerWidth < 768) {
      grid.style.gridTemplateColumns = '1fr';
      grid.style.gridTemplateRows = '';
      const areas = Array.from({ length: count }, (_, i) => `"${letter(i)}"`).join(' ');
      grid.style.gridTemplateAreas = areas;
      items.slice(0, count).forEach((it, i) => {
        it.style.gridArea = letter(i);
      });
      return;
    }

    // Desktop: two columns
    grid.style.gridTemplateColumns = '1fr 1fr';
    const effectiveCount = Math.min(8, Math.max(count, items.length, imgs.length));
    const n = Math.min(effectiveCount, 8);
    
    if (n === 0) {
      grid.style.gridTemplateAreas = '';
      return;
    }

    // If any relevant images are not yet loaded, wait for them (use natural dimensions)
    const relevantImgs = imgs.slice(0, n);
    const needLoad = relevantImgs.some((im) => !im.complete || !im.naturalWidth);
    if (relevantImgs.length > 0 && needLoad) {
      let loaded = 0;
      const onOneLoad = () => {
        loaded++;
        if (loaded >= relevantImgs.length) {
          setGridStyles();
        }
      };
      relevantImgs.forEach((im) => {
        if (im.complete && im.naturalWidth) onOneLoad();
        else im.addEventListener('load', onOneLoad, { once: true });
      });
      return;
    }

    // Build template and mapping
    let template = '';
    const mapping = new Array(n).fill(null);

    if (n === 1) {
      template = '"a a"';
      mapping[0] = 'a';
    } else if (n === 2) {
      template = '"a b"';
      mapping[0] = 'a';
      mapping[1] = 'b';
    } else if (n === 3) {
      // prefer first portrait among the first 3, otherwise use the last
      let portraitIndex = -1;
      for (let i = 0; i < Math.min(3, relevantImgs.length); i++) {
        const im = relevantImgs[i];
        if (im && im.naturalWidth && im.naturalHeight && im.naturalHeight > im.naturalWidth) {
          portraitIndex = i;
          break;
        }
      }
      if (portraitIndex === -1) portraitIndex = Math.min(2, relevantImgs.length - 1);
      const others = [0, 1, 2].filter((i) => i !== portraitIndex);
      // a, b = left column (stacked), c = right column (portrait spanning 2 rows)
      mapping[others[0]] = 'a';
      mapping[others[1]] = 'b';
      mapping[portraitIndex] = 'c';
      template = '"a c" "b c"';
      grid.style.gridTemplateRows = '50dvh 50dvh';
      // items must fill their grid cell (portrait spans 2 rows = 100dvh)
      items.slice(0, 3).forEach((it) => {
        const img = it.querySelector('img');
        if (img) { img.style.height = '100%'; img.style.width = '100%'; }
        it.style.height = '100%';
      });
    } else if (n === 4) {
      template = '"a b" "c d"';
      for (let i = 0; i < 4; i++) mapping[i] = letter(i);
    } else if (n === 5) {
      template = '"a b" "c d" "e e"';
      for (let i = 0; i < 5; i++) mapping[i] = letter(i);
    } else if (n === 6) {
      template = '"a b" "c d" "e f"';
      for (let i = 0; i < 6; i++) mapping[i] = letter(i);
    } else if (n === 7) {
      template = '"a b" "c d" "e f" "g g"';
      for (let i = 0; i < 7; i++) mapping[i] = letter(i);
    } else {
      template = '"a b" "c d" "e f" "g h"';
      for (let i = 0; i < 8; i++) mapping[i] = letter(i);
    }

    grid.style.gridTemplateAreas = template;

    // assign gridArea for each item (only for items that exist)
    items.forEach((it, i) => {
      if (i < mapping.length && mapping[i]) it.style.gridArea = mapping[i];
      else it.style.gridArea = letter(i);
    });
  }

  // expose single function
  window.setGridStyles = setGridStyles;

  // Only respond to resize here (no DOMContentLoaded layout call)
  window.addEventListener('resize', function () {
    try { setGridStyles(); } catch (e) {}
  });

  // Minimal click delegation for modal opening (kept separate from layout logic)
  document.addEventListener('click', function (e) {
    try {
      const target = e.target && e.target.closest && e.target.closest('[data-photo-url]');
      if (target) {
        const url = target.getAttribute('data-photo-url');
        if (url && typeof window.openModal === 'function') window.openModal(url);
      }
    } catch (err) {}
  });
})();