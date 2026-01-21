// Endpoint API pour supprimer tous les utilisateurs rejetés (réservé aux administrateurs)
// ⚠️ CRITIQUE: Vérification JWT implémentée pour sécuriser cette opération sensible
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import { verifyJWT, createErrorResponse, verifyCSRFToken } from '../../lib/security';
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

export const DELETE: APIRoute = async ({ request }) => {
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

    // Parsing du corps de la requête pour le token CSRF
    let body;
    try {
      const bodyText = await request.text();
      if (!bodyText) {
        return createErrorResponse('Body requis', 400);
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return createErrorResponse('JSON invalide', 400);
    }

    const { csrfToken } = body;

    // ✅ VÉRIFICATION CRITIQUE: Vérification du token CSRF pour prévenir les attaques CSRF
    if (!csrfToken || !verifyCSRFToken(csrfToken, decoded.id)) {
      return createErrorResponse('Token CSRF invalide ou manquant', 403);
    }

    // Suppression de tous les utilisateurs rejetés
    try {
      // Récupération de la liste des utilisateurs rejetés
      const rejectedUsers = await pbServer.collection('users').getFullList({
        filter: 'rejected = true',
      });

      let deleted = 0;
      let errors = 0;

      // Suppression de chaque utilisateur rejeté
      for (const user of rejectedUsers) {
        try {
          await pbServer.collection('users').delete(user.id);
          deleted++;
        } catch (deleteError) {
          // Enregistrement des erreurs sans arrêter le processus
          errors++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${deleted} utilisateur(s) rejeté(s) supprimé(s)`,
          deleted,
          errors: errors > 0 ? errors : undefined,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (deleteError) {
      const errorMsg =
        deleteError instanceof Error ? deleteError.message : 'Erreur lors de la suppression';
      return createErrorResponse(errorMsg, 500, isDevelopment);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Une erreur serveur est survenue';
    return createErrorResponse(errorMsg, 500, isDevelopment);
  }
};
