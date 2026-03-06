import { gsap } from "gsap";

// Clé globale utilisée pour éviter plusieurs animations concurrentes sur le défilement de fenêtre.
const WINDOW_SCROLL_TWEEN_KEY = "__kcWindowScrollTween";

// Accepte un nombre (ou une chaîne numérique) et renvoie une position exploitable.
function parseNumericTarget(target) {
  if (typeof target === "number" && Number.isFinite(target)) return target;
  if (typeof target === "string") {
    const trimmed = target.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  }
  return null;
}

// Résout une cible de défilement :
// - "#id" => élément du DOM
// - Element => renvoyé tel quel
function resolveTargetElement(target) {
  if (typeof target === "string" && target.startsWith("#")) {
    return document.querySelector(target);
  }
  if (target instanceof Element) return target;
  return null;
}

// Empêche de défiler en dehors des bornes réelles du conteneur.
function clampScrollTarget(container, axis, value) {
  if (container === window) {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const maxX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    if (axis === "x") return Math.min(Math.max(0, value), maxX);
    return Math.min(Math.max(0, value), maxY);
  }

  if (container instanceof HTMLElement) {
    const maxY = Math.max(0, container.scrollHeight - container.clientHeight);
    const maxX = Math.max(0, container.scrollWidth - container.clientWidth);
    if (axis === "x") return Math.min(Math.max(0, value), maxX);
    return Math.min(Math.max(0, value), maxY);
  }

  return value;
}

// Positionne immédiatement le défilement (sans animation).
function setScrollPosition(container, axis, value, behavior = "auto") {
  if (container === window) {
    if (axis === "x") {
      window.scrollTo({ left: value, top: window.scrollY, behavior });
    } else {
      window.scrollTo({ top: value, left: window.scrollX, behavior });
    }
    return true;
  }

  if (container instanceof HTMLElement) {
    if (axis === "x") {
      container.scrollTo({ left: value, behavior });
    } else {
      container.scrollTo({ top: value, behavior });
    }
    return true;
  }

  return false;
}

// Calcule la position absolue d'un élément dans le repère du conteneur visé.
function getElementPositionInContainer(element, container, axis) {
  if (container === window) {
    const rect = element.getBoundingClientRect();
    return axis === "x" ? window.scrollX + rect.left : window.scrollY + rect.top;
  }

  if (container instanceof HTMLElement) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return axis === "x"
      ? container.scrollLeft + (elementRect.left - containerRect.left)
      : container.scrollTop + (elementRect.top - containerRect.top);
  }

  return null;
}

// Anime le défilement avec GSAP pour un déplacement fluide.
function tweenScroll(container, axis, targetValue, duration, ease) {
  if (container === window) {
    const startValue = axis === "x" ? window.scrollX : window.scrollY;
    const state = { value: startValue };

    const previousTween = globalThis[WINDOW_SCROLL_TWEEN_KEY];
    if (previousTween && typeof previousTween.kill === "function") {
      previousTween.kill();
    }

    const tween = gsap.to(state, {
      value: targetValue,
      duration,
      ease,
      overwrite: "auto",
      onUpdate: () => {
        setScrollPosition(window, axis, state.value, "auto");
      },
    });

    globalThis[WINDOW_SCROLL_TWEEN_KEY] = tween;
    return true;
  }

  if (container instanceof HTMLElement) {
    if (axis === "x") {
      gsap.to(container, {
        scrollLeft: targetValue,
        duration,
        ease,
        overwrite: "auto",
      });
    } else {
      gsap.to(container, {
        scrollTop: targetValue,
        duration,
        ease,
        overwrite: "auto",
      });
    }
    return true;
  }

  return false;
}

export function scrollToTarget(target, options = {}) {
  if (typeof window === "undefined") return false;

  const {
    behavior = "smooth",
    container = window,
    axis = "y",
    offset = 0,
    duration = 0.45,
    ease = "power2.out",
  } = options;

  const targetElement = resolveTargetElement(target);
  let rawPosition = null;
  if (targetElement) {
    rawPosition = getElementPositionInContainer(targetElement, container, axis);
  } else {
    rawPosition = parseNumericTarget(target);
  }

  if (rawPosition == null) return false;

  const finalTarget = clampScrollTarget(container, axis, rawPosition + offset);

  // Mode instantané (sans animation) utile pour certains cas techniques.
  if (behavior === "auto" || duration <= 0) {
    return setScrollPosition(container, axis, finalTarget, "auto");
  }

  // Mode animé par défaut.
  return tweenScroll(container, axis, finalTarget, duration, ease);
}

// Expose l'utilitaire sur globalThis pour les scripts en ligne (ex : Astro define:vars).
try {
  if (typeof globalThis !== "undefined") {
    globalThis.scrollUtils = Object.assign(globalThis.scrollUtils || {}, {
      scrollToTarget,
    });
  }
} catch (error) {
}
