// src/middleware/index.ts
import PocketBase from "pocketbase";
import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware(
  async ({ locals, request, isPrerendered }, next: () => any) => {

    // Host public (derrière Apache)
    // On prend uniquement la 1ère valeur — Apache peut envoyer des headers multi-valeurs (ex: "https, http")
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const host = rawHost.split(",")[0].split(":")[0].trim().toLowerCase();
    const proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();

    const isProductionDomain =
      host === "www.kiwanis-pays-de-montbeliard.fr" ||
      host === "kiwanis-pays-de-montbeliard.fr";

    const isLocal =
      host.includes("localhost") ||
      host.includes("127.0.0.1");

    const isBryanDomain =
      host.includes("bryan-menoux.fr");

    // Redirection vers la page construction
    // Contrôlé uniquement par UNDER_CONSTRUCTION=true dans le .env PM2 du VPS
    if (process.env.UNDER_CONSTRUCTION === "true") {
      const { pathname } = new URL(request.url);

      const isAllowed =
        pathname === "/construction" ||
        pathname.startsWith("/_astro/") ||
        pathname.startsWith("/fonts/") ||
        pathname.startsWith("/vendor/") ||
        pathname === "/favicon.ico" ||
        pathname === "/favicon.svg";

      if (!isAllowed) {
        return Response.redirect(
          `${proto}://${host}/construction`,
          302
        );
      }
    }

    const pbUrl = import.meta.env.PROD
      ? (process.env.POCKETBASE_URL ?? "https://pb.kiwanis-pays-de-montbeliard.fr")
      : "http://127.0.0.1:8090";

    locals.pb = new PocketBase(pbUrl);

    if (!isPrerendered) {
      locals.pb.authStore.loadFromCookie(request.headers.get("cookie") || "");

      try {
        if (locals.pb.authStore.isValid) {
          await locals.pb.collection("users").authRefresh();
        }
      } catch (_) {
        locals.pb.authStore.clear();
      }

      const url = new URL(request.url);
      const protectedPrefixes = ["/creation"];

      if (protectedPrefixes.some((p) => url.pathname.startsWith(p))) {
        const userRecord = locals.pb.authStore.record;
        const isAuthenticated = Boolean(locals.pb.authStore.isValid && userRecord);
        const isAdmin = userRecord?.administrateur === true;
        const isVerified = userRecord?.verified === true;

        if (!isAuthenticated || !(isAdmin && isVerified)) {
          const redirectUrl = new URL("/connexion", request.url).toString();
          return Response.redirect(redirectUrl, 302);
        }
      }
    }

    const response = await next();

    if (!isPrerendered) {
      response.headers.append(
        "set-cookie",
        locals.pb.authStore.exportToCookie(),
      );
    }

    return response;
  },
);