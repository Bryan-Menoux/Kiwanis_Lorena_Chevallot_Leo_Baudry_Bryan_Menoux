// Endpoint API pour récupérer les données complètes de l'utilisateur connecté
// ⚠️ CRITIQUE: Authentification et autorisation requises
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import { verifyJWT, isValidUserId, createErrorResponse } from '../../lib/security';
import dotenv from 'dotenv';

export const prerender = false;

if (typeof process !== 'undefined' && process.env) {
  try {
    dotenv.config();
  } catch (e) {}
}

export const POST: APIRoute = async ({ request }) => {
  console.log('[DEBUG API] get-user-full endpoint called');
  try {
    // ✅ VÉRIFICATION CRITIQUE: Authentification via Bearer token
    const authHeader = request.headers.get('authorization');
    console.log('[DEBUG API] Auth header present:', !!authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[DEBUG API] No valid auth header');
      return createErrorResponse('Non authentifié - token manquant', 401);
    }

    const token = authHeader.substring(7);
    const pbServer = await getPbServerInstance();
    console.log('[DEBUG API] PB server instance created');

    // ✅ VÉRIFICATION CRITIQUE: Vérification et décodage du token JWT
    const decoded = await verifyJWT(token, pbServer);
    console.log('[DEBUG API] Token decoded:', decoded ? 'success' : 'failed');
    if (!decoded || !decoded.id) {
      console.log('[DEBUG API] Invalid token');
      return createErrorResponse('Token invalide ou expiré', 401);
    }

    // Parsing du corps de la requête
    let body;
    try {
      body = await request.json();
      console.log('[DEBUG API] Request body:', body);
    } catch (parseError) {
      console.log('[DEBUG API] JSON parse error:', parseError);
      return createErrorResponse('Invalid JSON', 400);
    }

    const { userId } = body;
    console.log('[DEBUG API] Requested userId:', userId);

    // ✅ VALIDATION: Vérification du format de l'ID
    if (!userId || typeof userId !== 'string' || !isValidUserId(userId)) {
      console.log('[DEBUG API] Invalid userId format');
      return createErrorResponse('Format userId invalide', 400);
    }

    // ✅ AUTORISATION CRITIQUE: Vérifier que l'utilisateur demande ses propres données
    // L'utilisateur ne peut accéder qu'à ses propres informations
    if (decoded.id !== userId) {
      console.log('[DEBUG API] User trying to access another user data');
      return createErrorResponse('Non autorisé - vous ne pouvez accéder qu\'à vos propres données', 403);
    }

    // Récupération de l'utilisateur depuis la base de données
    try {
      console.log('[DEBUG API] Fetching user from database');
      const fullUser = await pbServer.collection('users').getOne(userId);
      console.log('[DEBUG API] User data retrieved:', {
        id: fullUser.id,
        email: fullUser.email,
        verified: fullUser.verified,
        administrateur: fullUser.administrateur,
      });

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            verified: fullUser.verified,
            administrateur: fullUser.administrateur,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (pbError: any) {
      console.log('[DEBUG API] Database error:', pbError);
      return createErrorResponse('Utilisateur non trouvé', 404);
    }
  } catch (error: any) {
    console.log('[DEBUG API] General error:', error);
    return createErrorResponse('Erreur serveur', 500);
  }
};
