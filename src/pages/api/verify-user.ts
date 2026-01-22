// Endpoint API pour la vérification, le rejet ou l'annulation du rejet d'utilisateurs par les administrateurs
// ⚠️ CRITIQUE: Vérification JWT implémentée pour sécuriser les actions administrateur
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import {
  verifyJWT,
  isValidUserId,
  checkRateLimit,
  verifyCSRFToken,
  createErrorResponse,
  getClientIP,
} from '../../lib/security';
import dotenv from 'dotenv';

export const prerender = false;

// Chargement des variables d'environnement
if (typeof process !== 'undefined' && process.env) {
  try {
    dotenv.config();
  } catch (e) {
  }
}

export const POST: APIRoute = async ({ request }) => {
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
    } catch (userError) {
      return createErrorResponse('Utilisateur non trouvé', 401);
    }

    // Vérification des droits administrateur
    if (!currentUser?.administrateur || !currentUser?.verified) {
      return createErrorResponse('Non autorisé - droits admin requis', 403);
    }

    // Vérification du rate limiting pour prévenir les abus
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return createErrorResponse('Trop de requêtes - veuillez réessayer plus tard', 429);
    }

    // Parsing du corps de la requête
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

    // Extraction et validation des paramètres
    const { userId, action, csrfToken } = body;

    if (!userId || !action) {
      return createErrorResponse('userId et action requis', 400);
    }

    if (action !== 'verify' && action !== 'reject' && action !== 'reset' && action !== 'cancel-reject') {
      return createErrorResponse('action invalide (verify, reject, reset ou cancel-reject)', 400);
    }

    // Validation du format de l'ID utilisateur
    if (!isValidUserId(userId)) {
      return createErrorResponse('Format userId invalide', 400);
    }

    // ✅ VÉRIFICATION CRITIQUE: Vérification du token CSRF pour prévenir les attaques CSRF
    if (!csrfToken || !verifyCSRFToken(csrfToken, decoded.id)) {
      return createErrorResponse('Token CSRF invalide ou manquant', 403);
    }

    // Récupération de l'utilisateur cible
    let targetUser;
    try {
      targetUser = await pbServer.collection('users').getOne(userId);
    } catch (e) {
      return createErrorResponse('Utilisateur cible non trouvé', 404);
    }

    // Traitement selon l'action demandée
    if (action === 'verify') {
      // Vérification que l'utilisateur n'est pas déjà approuvé
      if (targetUser.verified === true) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Utilisateur déjà approuvé',
            user: targetUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const updatedUser = await pbServer.collection('users').update(userId, {
          verified: true,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Utilisateur approuvé', user: updatedUser }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (updateError) {
        const errorMsg =
          updateError instanceof Error
            ? updateError.message
            : 'Erreur lors de la mise à jour';
        return createErrorResponse(errorMsg, 500, isDevelopment);
      }
    } else if (action === 'reset') {
      try {
        const resetUser = await pbServer.collection('users').update(userId, {
          verified: false,
          rejected: false,
          rejectionDate: null,
          rejectedBy: null,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Utilisateur remis en attente de vérification',
            user: resetUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (resetError) {
        const errorMsg =
          resetError instanceof Error ? resetError.message : 'Erreur lors de la remise en attente';
        return createErrorResponse(errorMsg, 500, isDevelopment);
      }
    } else if (action === 'reject') {
      try {
        const rejectedUser = await pbServer.collection('users').update(userId, {
          verified: false,
          rejected: true,
          rejectionDate: new Date().toISOString(),
          rejectedBy: currentUser.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Demande rejetée',
            user: rejectedUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (rejectError) {
        const errorMsg =
          rejectError instanceof Error ? rejectError.message : 'Erreur lors du rejet';
        return createErrorResponse(errorMsg, 500, isDevelopment);
      }
    } else if (action === 'cancel-reject') {
      try {
        const canceledUser = await pbServer.collection('users').update(userId, {
          verified: false,
          rejected: false,
          rejectionDate: null,
          rejectedBy: null,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Rejet annulé - utilisateur remis en attente',
            user: canceledUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (cancelError) {
        const errorMsg =
          cancelError instanceof Error
            ? cancelError.message
            : 'Erreur lors de l\'annulation du rejet';
        return createErrorResponse(errorMsg, 500, isDevelopment);
      }
    }
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMsg = error instanceof Error ? error.message : 'Une erreur serveur est survenue';
    return createErrorResponse(errorMsg, 500, isDevelopment);
  }

  return createErrorResponse('Erreur inconnue', 500);
};
