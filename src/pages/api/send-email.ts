import type { APIRoute } from "astro";
import { sendContactEmails } from "../../utils/contactMail";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    await sendContactEmails(data);
    return new Response("OK");
  } catch (error) {
    console.error("❌ ERREUR EMAIL:", error);
    return new Response("Erreur serveur", { status: 500 });
  }
};
