import {
  optimizeFileListForField,
  WEBP_PREOPTIMIZED_ATTR,
} from "./actionForm/convertToWebp.js";

const LOGO_INPUT_SELECTOR = 'input[type="file"][name="logo"]';

const inputOptimizationTasks = new WeakMap();

function applyOptimizedFiles(input, files) {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
  input.setAttribute(WEBP_PREOPTIMIZED_ATTR, "true");
}

export function optimizeLogoInput(input) {
  if (!(input instanceof HTMLInputElement)) return Promise.resolve();
  if (!input.files || input.files.length === 0) {
    input.removeAttribute(WEBP_PREOPTIMIZED_ATTR);
    return Promise.resolve();
  }

  const existingTask = inputOptimizationTasks.get(input);
  if (existingTask) return existingTask;

  const task = (async () => {
    if (input.getAttribute(WEBP_PREOPTIMIZED_ATTR) === "true") return;

    const optimizedFiles = await optimizeFileListForField(
      Array.from(input.files || []),
      "logo",
    );
    applyOptimizedFiles(input, optimizedFiles);
  })().finally(() => {
    inputOptimizationTasks.delete(input);
  });

  inputOptimizationTasks.set(input, task);
  return task;
}

export function initLogoOptimization() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches(LOGO_INPUT_SELECTOR)) return;

    target.setAttribute(WEBP_PREOPTIMIZED_ATTR, "false");
    void optimizeLogoInput(target);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const logoInput = form.querySelector(LOGO_INPUT_SELECTOR);
    if (!(logoInput instanceof HTMLInputElement)) return;
    if (!logoInput.files || logoInput.files.length === 0) return;

    // Déjà optimisé lors du change, on laisse passer
    if (logoInput.getAttribute(WEBP_PREOPTIMIZED_ATTR) === "true") return;

    event.preventDefault();

    void optimizeLogoInput(logoInput).finally(() => {
      HTMLFormElement.prototype.submit.call(form);
    });
  });
}
