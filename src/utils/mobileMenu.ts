type MobileMenuOptions = {
  toggleId: string;
  dropdownId: string;
  itemSelector: string;
  breakpoint?: number;
  onClose?: () => void;
};

function setHidden(dropdown: HTMLElement) {
  dropdown.classList.add("hidden", "pointer-events-none", "opacity-0", "-translate-y-[10px]");
}

function revealDropdown(dropdown: HTMLElement) {
  dropdown.classList.remove("hidden");
  window.requestAnimationFrame(() => {
    dropdown.classList.remove("pointer-events-none", "opacity-0", "-translate-y-[10px]");
  });
}

function setItemsHidden(items: HTMLElement[]) {
  items.forEach((item, index) => {
    item.style.transitionDelay = "0ms";
    item.style.transitionDuration = "150ms";
    item.classList.add("opacity-0", "translate-y-[5px]");
    item.dataset.menuIndex = String(index);
  });
}

function animateItemsIn(items: HTMLElement[]) {
  items.forEach((item, index) => {
    item.style.transitionDelay = `${100 + index * 20}ms`;
    item.style.transitionDuration = "150ms";
    item.classList.remove("opacity-0", "translate-y-[5px]");
  });
}

function prepareHamburger(...lines: (HTMLElement | null)[]) {
  lines.forEach((line) => {
    if (!line) return;
    line.style.transformOrigin = "center";
    line.style.transition = "transform 200ms ease";
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

  let isOpen = false;
  let hideTimer = 0;
  let itemResetTimer = 0;

  prepareHamburger(hamTop, hamBottom);
  setHidden(dropdown);
  setItemsHidden(items);

  const closeMenu = (immediate = false) => {
    window.clearTimeout(hideTimer);
    window.clearTimeout(itemResetTimer);
    isOpen = false;
    toggle.setAttribute("aria-expanded", "false");
    dropdown.setAttribute("aria-hidden", "true");
    onClose?.();

    if (immediate) {
      setHidden(dropdown);
      setItemsHidden(items);
      setHamburgerState(hamTop, hamBottom, false);
      return;
    }

    dropdown.style.transitionDuration = "150ms";
    dropdown.classList.add("pointer-events-none", "opacity-0", "-translate-y-[10px]");
    hideTimer = window.setTimeout(() => {
      dropdown.classList.add("hidden");
    }, 150);
    itemResetTimer = window.setTimeout(() => {
      setItemsHidden(items);
    }, 150);

    setHamburgerState(hamTop, hamBottom, false);
  };

  const openMenu = () => {
    window.clearTimeout(hideTimer);
    window.clearTimeout(itemResetTimer);
    isOpen = true;
    toggle.setAttribute("aria-expanded", "true");
    dropdown.setAttribute("aria-hidden", "false");

    dropdown.style.transitionDuration = "200ms";
    setItemsHidden(items);
    revealDropdown(dropdown);
    window.requestAnimationFrame(() => {
      animateItemsIn(items);
    });
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
