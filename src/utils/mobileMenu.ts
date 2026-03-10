type MobileMenuOptions = {
  toggleId: string;
  dropdownId: string;
  itemSelector: string;
  breakpoint?: number;
  onClose?: () => void;
};

type GsapInstance = NonNullable<Window["gsap"]>;

let gsapLoader: Promise<GsapInstance | null> | null = null;

function requestGsap(): Promise<GsapInstance | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  if (window.gsap) {
    return Promise.resolve(window.gsap);
  }

  if (!gsapLoader) {
    gsapLoader = import("./loadGsap")
      .then(({ loadGsap }) => loadGsap())
      .catch(() => null);
  }

  return gsapLoader;
}

function setHidden(dropdown: HTMLElement) {
  dropdown.style.display = "none";
  dropdown.style.opacity = "0";
  dropdown.style.transform = "translateY(-10px)";
}

function prepareHamburger(...lines: (HTMLElement | null)[]) {
  lines.forEach((line) => {
    if (!line) return;
    line.style.transformOrigin = "center";
  });
}

function setHamburgerState(
  hamTop: HTMLElement | null,
  hamBottom: HTMLElement | null,
  isOpen: boolean,
) {
  if (!hamTop || !hamBottom) return;
  hamTop.style.transform = isOpen ? "translateY(3.5px) rotate(45deg)" : "";
  hamBottom.style.transform = isOpen ? "translateY(-3.5px) rotate(-45deg)" : "";
}

export function initMobileMenu({
  toggleId,
  dropdownId,
  itemSelector,
  breakpoint = 1024,
  onClose,
}: MobileMenuOptions) {
  const toggle = document.getElementById(toggleId);
  const dropdown = document.getElementById(dropdownId);

  if (!(toggle instanceof HTMLButtonElement) || !(dropdown instanceof HTMLElement)) {
    return;
  }

  if (toggle.dataset.menuBound === "true") return;
  toggle.dataset.menuBound = "true";

  const items = Array.from(dropdown.querySelectorAll<HTMLElement>(itemSelector));
  const headerContainer = toggle.closest("header");
  const hamTop = document.getElementById("ham-top");
  const hamBottom = document.getElementById("ham-bottom");
  let gsap: GsapInstance | null = null;

  let isOpen = false;
  let hideTimer = 0;

  prepareHamburger(hamTop, hamBottom);

  setHidden(dropdown);

  const closeMenu = (immediate = false) => {
    window.clearTimeout(hideTimer);
    isOpen = false;
    toggle.setAttribute("aria-expanded", "false");
    dropdown.setAttribute("aria-hidden", "true");
    onClose?.();

    if (immediate) {
      gsap?.killTweensOf([dropdown, ...items]);
      if (gsap) {
        gsap.set(dropdown, { display: "none", opacity: 0, y: -10 });
      } else {
        setHidden(dropdown);
      }
      setHamburgerState(hamTop, hamBottom, false);
      return;
    }

    if (gsap) {
      gsap.killTweensOf([dropdown, ...items]);
      gsap
        .timeline()
        .to(dropdown, { opacity: 0, y: -10, duration: 0.15, ease: "power2.in" })
        .set(dropdown, { display: "none" });
    } else {
      dropdown.style.opacity = "0";
      dropdown.style.transform = "translateY(-10px)";
      hideTimer = window.setTimeout(() => {
        dropdown.style.display = "none";
      }, 150);
    }

    setHamburgerState(hamTop, hamBottom, false);
  };

  const openMenu = () => {
    window.clearTimeout(hideTimer);
    isOpen = true;
    toggle.setAttribute("aria-expanded", "true");
    dropdown.setAttribute("aria-hidden", "false");

    if (!gsap) {
      void requestGsap().then((instance) => {
        gsap = instance;
      });
    }

    if (gsap) {
      gsap.killTweensOf([dropdown, ...items]);
      dropdown.style.display = "block";
      gsap
        .timeline()
        .to(dropdown, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
        .fromTo(
          items,
          { opacity: 0, y: 5 },
          { opacity: 1, y: 0, stagger: 0.02, duration: 0.15, overwrite: "auto" },
          "-=0.1",
        );
    } else {
      dropdown.style.display = "block";
      dropdown.style.opacity = "1";
      dropdown.style.transform = "translateY(0)";
    }

    setHamburgerState(hamTop, hamBottom, true);
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  toggle.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  document.addEventListener("click", (event) => {
    if (!isOpen) return;
    if (!(event.target instanceof Node)) return;

    const clickedOutsideHeader = headerContainer
      ? !headerContainer.contains(event.target)
      : !toggle.contains(event.target) && !dropdown.contains(event.target);

    if (clickedOutsideHeader) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= breakpoint && isOpen) {
      closeMenu(true);
    }
  });
}
