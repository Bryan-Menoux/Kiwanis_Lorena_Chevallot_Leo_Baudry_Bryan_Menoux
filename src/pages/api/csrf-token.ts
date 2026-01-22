import type { APIRoute } from "astro";
import { generateCSRFToken, verifyJWT } from "../../lib/security";
import { getPbServerInstance } from "../../lib/pocketbase.mjs";

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json(
        { error: "Content-Type invalide. Utilisez application/json." },
        415
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Non authentifié" }, 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) return json({ error: "Non authentifié" }, 401);

    const pbServer = await getPbServerInstance();

    const decoded = await verifyJWT(token, pbServer);
    if (!decoded || !decoded.id) {
      return json({ error: "Token invalide" }, 401);
    }

    const csrfToken = generateCSRFToken(decoded.id, 300);

    return json({ success: true, csrfToken, expiresIn: 300 }, 200);
  } catch {
    return json({ error: "Une erreur serveur est survenue" }, 500);
  }
};
