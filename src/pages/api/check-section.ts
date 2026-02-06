import type { APIRoute } from 'astro';
import crypto from 'crypto';

export const GET: APIRoute = async ({ locals, url }) => {
  const sectionId = url.searchParams.get('section');
  const lastHash = url.searchParams.get('hash');
  
  if (!sectionId) {
    return new Response(JSON.stringify({ error: 'Section required' }), { status: 400 });
  }

  const currentUser = locals.pb.authStore.model;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let dataToHash = '';

  switch (sectionId) {
    case 'my-account':
      // Pour my-account, toujours retourner 200 avec le hash actuel
      // car les mises à jour se font via AJAX avec UI optimiste
      dataToHash = JSON.stringify({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        updated: currentUser.updated,
      });
      break;
    case 'verifications':
      if (!currentUser.administrateur) {
        return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403 });
      }
      const usersForVerif = await locals.pb.collection("users").getFullList();
      dataToHash = JSON.stringify(usersForVerif);
      break;
    case 'modifications':
      if (!currentUser.administrateur) {
        return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403 });
      }
      // Utiliser les mêmes données que verifications car les sections sont liées
      const usersForModif = await locals.pb.collection("users").getFullList();
      dataToHash = JSON.stringify(usersForModif);
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
  }

  const hash = crypto.createHash('md5').update(dataToHash).digest('hex');
  
  // Pour my-account, permettre le rechargement si les données ont changé
  // (utile quand on revient sur la section après des modifications)
  if (sectionId === 'my-account') {
    const changed = hash !== lastHash;
    return new Response(JSON.stringify({ hash, changed }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
  
  // Pour les autres sections, comparer le hash
  const changed = hash !== lastHash;
  
  return new Response(JSON.stringify({ hash, changed }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
