import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { event, fieldName, action, details } = data;

    console.log(`[ImageDeletion] ${event}`, {
      fieldName,
      action,
      details,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('[ImageDeletion] Erreur:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 400 });
  }
};
