import PREVIEW_DEFAULTS from "../previewDefaults.js";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-prop]").forEach((el) => {
    const prop = el.getAttribute("data-prop");
    if (prop && PREVIEW_DEFAULTS[prop]) {
      el.setAttribute("placeholder", PREVIEW_DEFAULTS[prop]);
    }
  });
});
