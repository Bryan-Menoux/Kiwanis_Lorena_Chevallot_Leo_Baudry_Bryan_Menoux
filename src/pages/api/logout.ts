import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals }) => {
  // Déconnecter l'utilisateur
  locals.pb.authStore.clear();

  return new Response(
    JSON.stringify({ success: true, message: 'Déconnecté avec succès' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
