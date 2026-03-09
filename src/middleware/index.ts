// src/middleware/index.ts
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import PocketBase from "pocketbase";
import { defineMiddleware } from "astro/middleware";

const require = createRequire(import.meta.url);
const PROD_POCKETBASE_URL = "https://pb.kiwanis-pays-de-montbeliard.fr";
const DEV_POCKETBASE_URL = "https://pb-kiwanis.bryan-menoux.fr";
const LOCAL_POCKETBASE_URL = "http://127.0.0.1:8090";

const PROD_HOSTS = new Set([
  "www.kiwanis-pays-de-montbeliard.fr",
  "kiwanis-pays-de-montbeliard.fr",
]);

const DEV_HOSTS = new Set([
  "kiwanis-pays-de-montbeliard.bryan-menoux.fr",
  "www.kiwanis-pays-de-montbeliard.bryan-menoux.fr",
]);

function readPocketBaseUrlFromEcosystem(): string | null {
  const configuredPath = process.env.PM2_ECOSYSTEM_FILE || process.env.ECOSYSTEM_CONFIG_PATH;
  const candidateFiles = [
    configuredPath,
    path.resolve(process.cwd(), "ecosystem.config.cjs"),
    path.resolve(process.cwd(), "../ecosystem.config.cjs"),
    path.resolve(process.cwd(), "../../ecosystem.config.cjs"),
  ].filter((value): value is string => Boolean(value));

  for (const filePath of candidateFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const ecosystemModule = require(filePath);
      const ecosystem = ecosystemModule?.default ?? ecosystemModule;
      const topLevelUrl =
        ecosystem?.env_production?.POCKETBASE_URL ??
        ecosystem?.env?.POCKETBASE_URL;

      if (typeof topLevelUrl === "string" && topLevelUrl.trim()) {
        return topLevelUrl.trim();
      }

      const appsValue = Array.isArray(ecosystem)
        ? ecosystem
        : ecosystem?.apps;

      const apps = Array.isArray(appsValue)
        ? appsValue
        : appsValue
          ? [appsValue]
          : [];

      for (const app of apps) {
        const url =
          app?.env_production?.POCKETBASE_URL ??
          app?.env?.POCKETBASE_URL;

        if (typeof url === "string" && url.trim()) {
          return url.trim();
        }
      }
    } catch {
      // Ignore invalid or unreadable ecosystem files and continue.
    }
  }

  return null;
}

function resolvePocketBaseUrl(isProd: boolean, host: string): string {
  if (!isProd) {
    return LOCAL_POCKETBASE_URL;
  }

  if (PROD_HOSTS.has(host)) {
    return PROD_POCKETBASE_URL;
  }

  if (DEV_HOSTS.has(host)) {
    return DEV_POCKETBASE_URL;
  }

  const envUrl = process.env.POCKETBASE_URL;
  if (typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim();
  }

  return readPocketBaseUrlFromEcosystem() ?? PROD_POCKETBASE_URL;
}

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

    const pbUrl = resolvePocketBaseUrl(import.meta.env.PROD, host);

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
