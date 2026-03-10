import PREVIEW_DEFAULTS from "../previewDefaults.js";

const PLACEHOLDER_PROP_ALIASES = {
  titre_remerciement: "titre_remerciements",
  description_remerciement: "description_remerciements",
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-prop]").forEach((el) => {
    const prop = el.getAttribute("data-prop");
    if (!prop) return;

    const placeholderKey = PLACEHOLDER_PROP_ALIASES[prop] || prop;
    const placeholderValue = PREVIEW_DEFAULTS[placeholderKey];
    if (typeof placeholderValue !== "string") return;

    el.setAttribute("placeholder", placeholderValue);
  });
});
