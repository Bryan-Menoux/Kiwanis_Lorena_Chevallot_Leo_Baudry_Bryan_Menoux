export function setupHeaderLogout() {
  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("mobile-logout-btn") as HTMLButtonElement | null;
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/logout", { method: "POST" });
          if (res.ok) window.location.href = "/connexion";
        } catch (e) {
          console.error("Erreur lors de la déconnexion:", e);
        }
      });
    }
  });
}

export function setupRedirectLinks() {
  document.addEventListener("DOMContentLoaded", () => {
    const current = window.location.pathname + window.location.search;
    if (!current.startsWith("/connexion")) {
      const enc = encodeURIComponent(current);
      const connexionLink = document.getElementById("connexion-link") as HTMLAnchorElement | null;
      const mobileConnexionLink = document.getElementById("mobile-connexion-link") as HTMLAnchorElement | null;
      
      if (connexionLink) connexionLink.setAttribute("href", "/connexion?redirect=" + enc);
      if (mobileConnexionLink) mobileConnexionLink.setAttribute("href", "/connexion?redirect=" + enc);
    }
  });
}
