import { loadGsap } from "./loadGsap";

type MobileMenuOptions = {
  toggleId: string;
  dropdownId: string;
  itemSelector: string;
  breakpoint?: number;
  onClose?: () => void;
};

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

export async function initMobileMenu({
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
  const hamTop = document.getElementById("ham-top");
  const hamBottom = document.getElementById("ham-bottom");
  const gsap = await loadGsap();

  let isOpen = false;
  let hideTimer = 0;

  prepareHamburger(hamTop, hamBottom);

  if (gsap) {
    gsap.set(dropdown, { display: "none", opacity: 0, y: -10 });
  } else {
    setHidden(dropdown);
  }

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

  window.addEventListener("resize", () => {
    if (window.innerWidth >= breakpoint && isOpen) {
      closeMenu(true);
    }
  });
}
