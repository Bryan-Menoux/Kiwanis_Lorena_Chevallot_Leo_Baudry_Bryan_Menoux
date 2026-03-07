// src/middleware/index.ts
import PocketBase from "pocketbase";


import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware(
  async ({ locals, request, isPrerendered }, next: () => any) => {
    // Débogage : journaliser les en-têtes d'origine sur les requêtes POST (temporaire, piloté par DEBUG_ORIGIN)
    if (request.method === "POST" && process.env.DEBUG_ORIGIN === "true") {
      const proto = request.headers.get("x-forwarded-proto") || "http";
      const debugHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
      // Le journal des origines en mode debug a été retiré pour réduire le bruit console.
    }

    // Rediriger tout le trafic vers la page de construction si activé via .env
    if (process.env.UNDER_CONSTRUCTION === "true") {
      const requestUrl = new URL(request.url);
      const { pathname } = requestUrl;
      // Laisser passer uniquement la page construction elle-même et les assets statiques
      const isAllowed =
        pathname === "/construction" ||
        pathname.startsWith("/_astro/") ||
        pathname.startsWith("/fonts/") ||
        pathname.startsWith("/vendor/");
      if (!isAllowed) {
        return Response.redirect(new URL("/construction", request.url).toString(), 302);
      }
    }

    const pbUrl = import.meta.env.PROD
      ? (process.env.POCKETBASE_URL ?? "https://pb-kiwanis.bryan-menoux.fr")
      : "http://127.0.0.1:8090";
    
    locals.pb = new PocketBase(pbUrl);

    if (!isPrerendered) {
      // Charger l'état d'authentification depuis la chaîne de cookies de la requête
      locals.pb.authStore.loadFromCookie(request.headers.get("cookie") || "");

      try {
        // Mettre à jour l'état d'auth en vérifiant et rafraîchissant le record chargé (s'il existe)
        locals.pb.authStore.isValid &&
          (await locals.pb.collection("users").authRefresh());
      } catch (_) {
        // Vider l'état d'auth en cas d'échec du rafraîchissement
        locals.pb.authStore.clear();
      }

      // Rediriger les requêtes non authentifiées sur les routes protégées.
      // Autoriser `/creation` uniquement pour les utilisateurs authentifiés admin et vérifiés.
      const url = new URL(request.url);
      const protectedPrefixes = ["/creation"];
      if (protectedPrefixes.some((p) => url.pathname.startsWith(p))) {
        const userRecord = locals.pb.authStore.record;
        const isAuthenticated = Boolean(locals.pb.authStore.isValid && userRecord);
        const isAdmin = userRecord?.administrateur === true;
        const isVerified = userRecord?.verified === true;
        // Exiger admin ET vérifié pour accéder à /creation
        if (!isAuthenticated || !(isAdmin && isVerified)) {
          const redirectUrl = new URL("/connexion", request.url).toString();
          return Response.redirect(redirectUrl, 302);
        }
      }
    }

    const response = await next();

    if (!isPrerendered) {
      // Renvoyer le cookie `pb_auth` au client avec l'état le plus récent
      response.headers.append(
        "set-cookie",
        locals.pb.authStore.exportToCookie(),
      );
    }
    return response;
  },
);
