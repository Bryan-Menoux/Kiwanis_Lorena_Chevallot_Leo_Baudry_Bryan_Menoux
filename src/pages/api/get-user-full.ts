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
  try {
    // ✅ VÉRIFICATION CRITIQUE: Authentification via Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Non authentifié - token manquant', 401);
    }

    const token = authHeader.substring(7);
    const pbServer = await getPbServerInstance();

    // ✅ VÉRIFICATION CRITIQUE: Vérification et décodage du token JWT
    const decoded = await verifyJWT(token, pbServer);
    if (!decoded || !decoded.id) {
      return createErrorResponse('Token invalide ou expiré', 401);
    }

    // Parsing du corps de la requête
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { userId } = body;

    // ✅ VALIDATION: Vérification du format de l'ID
    if (!userId || typeof userId !== 'string' || !isValidUserId(userId)) {
      return createErrorResponse('Format userId invalide', 400);
    }

    // ✅ AUTORISATION CRITIQUE: Vérifier que l'utilisateur demande ses propres données
    // L'utilisateur ne peut accéder qu'à ses propres informations
    if (decoded.id !== userId) {
      return createErrorResponse('Non autorisé - vous ne pouvez accéder qu\'à vos propres données', 403);
    }

    // Récupération de l'utilisateur depuis la base de données
    try {
      const fullUser = await pbServer.collection('users').getOne(userId);

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
      return createErrorResponse('Utilisateur non trouvé', 404);
    }
  } catch (error: any) {
    return createErrorResponse('Erreur serveur', 500);
  }
};
