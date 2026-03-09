import type { GSAP } from "gsap";

let gsapPromise: Promise<GSAP | null> | null = null;

export function loadGsap(): Promise<GSAP | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.gsap) {
    return Promise.resolve(window.gsap);
  }

  if (!gsapPromise) {
    gsapPromise = import("gsap")
      .then((module) => {
        const instance = module.gsap || module.default || null;
        if (instance) {
          window.gsap = instance;
        }
        return instance;
      })
      .catch(() => null);
  }

  return gsapPromise;
}
