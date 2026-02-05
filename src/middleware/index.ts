// src/middleware/index.ts
import PocketBase from "pocketbase";


import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware(
  async ({ locals, request, isPrerendered }, next: () => any) => {
    // Debug: Log origin headers on POST requests (temporary, controlled by DEBUG_ORIGIN env var)
    if (request.method === "POST" && process.env.DEBUG_ORIGIN === "true") {
      const proto = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      console.log("[DEBUG_ORIGIN] POST to", request.url);
      console.log("  Origin header:", request.headers.get("origin"));
      console.log("  Host header:", request.headers.get("host"));
      console.log("  X-Forwarded-Proto:", proto);
      console.log("  X-Forwarded-Host:", request.headers.get("x-forwarded-host"));
      console.log("  URL origin:", new URL(request.url).origin);
      console.log("  ORIGIN env:", process.env.ORIGIN);
      console.log("  Reconstructed (X-Forwarded):", `${proto}://${host}`);
    }

    const pbUrl = import.meta.env.PROD 
      ? "https://pb-kiwanis.bryan-menoux.fr"
      : "http://127.0.0.1:8090";
    
    locals.pb = new PocketBase(pbUrl);

    if (!isPrerendered) {
      // load the store data from the request cookie string
      locals.pb.authStore.loadFromCookie(request.headers.get("cookie") || "");

      try {
        // get an up-to-date auth store state by verifying and refreshing the loaded auth record (if any)
        locals.pb.authStore.isValid &&
          (await locals.pb.collection("users").authRefresh());
      } catch (_) {
        // clear the auth store on failed refresh
        locals.pb.authStore.clear();
      }
    }

    const response = await next();

    if (!isPrerendered) {
      // send back the default 'pb_auth' cookie to the client with the latest store state
      response.headers.append(
        "set-cookie",
        locals.pb.authStore.exportToCookie(),
      );
    }
    return response;
  },
);
