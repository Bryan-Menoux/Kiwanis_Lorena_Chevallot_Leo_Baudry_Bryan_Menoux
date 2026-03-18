function animateCards() {
  const cards = Array.from(document.querySelectorAll("#leftForm .p-4"));
  const form = document.getElementById("leftForm");
  const isMobileWizard =
    form?.getAttribute("data-ui-mode") === "mobile-wizard" &&
    window.matchMedia("(max-width: 1023px)").matches;

  if (isMobileWizard) {
    cards.forEach((card) => {
      card.classList.remove("opacity-0", "-translate-x-4");
    });
    return;
  }

  cards.forEach((card, idx) => {
    card.classList.add(
      "opacity-0",
      "-translate-x-4",
      "transition-all",
      "duration-300",
      "ease-out",
    );
    setTimeout(() => {
      card.classList.remove("opacity-0", "-translate-x-4");
    }, idx * 100 + 50);
  });
}

function initCardAnimation() {
  const form = document.getElementById("leftForm");
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.cardAnimationInit === "true") return;
  form.dataset.cardAnimationInit = "true";

  const sidebar = document.getElementById("sidebar");
  const canUseSidebarAnimation = window.matchMedia("(min-width: 1024px)").matches;
  const shouldWaitForSidebarTransition =
    sidebar instanceof HTMLElement &&
    canUseSidebarAnimation &&
    sidebar.classList.contains("lg:transition-all");

  if (!shouldWaitForSidebarTransition) {
    animateCards();
    return;
  }

  let hasAnimated = false;
  const runOnce = () => {
    if (hasAnimated) return;
    hasAnimated = true;
    animateCards();
  };

  sidebar.addEventListener("transitionend", runOnce, { once: true });
  window.setTimeout(runOnce, 700);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCardAnimation, {
    once: true,
  });
} else {
  initCardAnimation();
}

document.addEventListener("astro:page-load", initCardAnimation);

export { animateCards, initCardAnimation };
