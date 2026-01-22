import type { APIRoute } from "astro";
import dotenv from "dotenv";
import { verifyJWT } from "../../lib/security";
import { getPbServerInstance } from "../../lib/pocketbase.mjs";

export const prerender = false;

try {
  dotenv.config();
} catch {}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Non authentifié" });
    }

    const token = authHeader.slice(7).trim();
    const pbServer = await getPbServerInstance();

    const decoded = await verifyJWT(token, pbServer);
    if (!decoded?.id) {
      return json(401, { error: "Token invalide" });
    }

    const me = await pbServer.collection("users").getOne(decoded.id, {
      fields: "id,administrateur,verified",
    });

    if (!me?.administrateur || !me?.verified) {
      return json(403, { error: "Accès refusé" });
    }

    const users = await pbServer.collection("users").getFullList({
      sort: "-created",
      filter: "verified=true",
      fields: "id,name,email,created",
    });

    return json(200, { users });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    const msg =
      isDev && error instanceof Error ? error.message : "Une erreur serveur est survenue";
    return json(500, { error: msg });
  }
};