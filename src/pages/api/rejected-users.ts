// Endpoint API pour récupérer la liste des utilisateurs rejetés (réservé aux administrateurs)
// ⚠️ CRITIQUE: Vérification JWT implémentée pour sécuriser l'accès
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import { verifyJWT, createErrorResponse } from '../../lib/security';
import dotenv from 'dotenv';

export const prerender = false;

// Chargement des variables d'environnement
if (typeof process !== 'undefined' && process.env) {
  try {
    dotenv.config();
  } catch (e) {
    console.warn('Dotenv config error:', e);
  }
}

export const GET: APIRoute = async ({ request }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Vérification de l'authentification - récupération du token Bearer
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

    // Récupération de l'utilisateur actuel depuis la base de données
    let currentUser;
    try {
      currentUser = await pbServer.collection('users').getOne(decoded.id);
    } catch (authError) {
      return createErrorResponse('Utilisateur non trouvé', 401);
    }

    // Vérification des droits administrateur
    if (!currentUser?.administrateur || !currentUser?.verified) {
      return createErrorResponse('Non autorisé - droits admin requis', 403);
    }

    // Récupération des utilisateurs rejetés
    try {
      const rejectedUsers = await pbServer.collection('users').getFullList({
        filter: 'rejected = true',
        sort: '-rejectionDate',
      });

      return new Response(
        JSON.stringify({
          success: true,
          users: rejectedUsers,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (getError) {
      const errorMsg =
        getError instanceof Error ? getError.message : 'Erreur lors de la récupération';
      return createErrorResponse(errorMsg, 500, isDevelopment);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Une erreur serveur est survenue';
    return createErrorResponse(errorMsg, 500, isDevelopment);
  }
};
