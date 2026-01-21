// Endpoint API pour la mise à jour du profil utilisateur
// Valide les modifications et applique la politique de mot de passe
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import {
  verifyJWT,
  validatePassword,
  createErrorResponse,
  sanitizeString,
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

export const PATCH: APIRoute = async ({ request }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Vérification de l'authentification via le token Bearer
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

      if (!currentUser || !currentUser.id) {
        return createErrorResponse('Utilisateur non trouvé', 404);
      }
    } catch (authError) {
      return createErrorResponse('Utilisateur non trouvé ou erreur d\'accès', 401);
    }

    // Vérification que l'utilisateur est vérifié
    if (!currentUser?.verified) {
      return createErrorResponse('Non autorisé - compte non vérifié', 403);
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

    // Validation des champs autorisés
    const allowedFields = ['name', 'password', 'passwordConfirm', 'oldPassword'];
    const forbiddenFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

    if (forbiddenFields.length > 0) {
      return createErrorResponse(
        `Champs non autorisés: ${forbiddenFields.join(', ')}. Seuls name et password peuvent être modifiés.`,
        400
      );
    }

    // Construction du payload de mise à jour
    const updatePayload: any = {};

    // Validation et ajout du nom
    if (body.name !== undefined) {
      const cleanedName = sanitizeString(body.name, 100);
      if (!cleanedName || cleanedName.trim().length === 0) {
        return createErrorResponse('Le nom doit être une chaîne non vide', 400);
      }
      updatePayload.name = cleanedName;
    }

    // Validation et ajout des champs de mot de passe
    if (body.password || body.oldPassword) {
      if (!body.oldPassword || !body.password || !body.passwordConfirm) {
        return createErrorResponse(
          'oldPassword, password et passwordConfirm requis pour changer le mot de passe',
          400
        );
      }

      // Vérification que les nouveaux mots de passe correspondent
      if (body.password !== body.passwordConfirm) {
        return createErrorResponse('Les nouveaux mots de passe ne correspondent pas', 400);
      }

      // ✅ VALIDATION: Vérification de la complexité du mot de passe
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return createErrorResponse(
          `Mot de passe insuffisamment complexe: ${passwordValidation.errors.join(', ')}`,
          400
        );
      }

      // Ajout des paramètres de mot de passe au payload
      updatePayload.oldPassword = body.oldPassword;
      updatePayload.password = body.password;
      updatePayload.passwordConfirm = body.passwordConfirm;
    }

    // Vérification qu'il y a au moins une modification
    if (Object.keys(updatePayload).length === 0) {
      return createErrorResponse('Aucune modification à apporter', 400);
    }

    // Mise à jour de l'utilisateur dans la base de données
    try {
      const updatedUser = await pbServer.collection('users').update(currentUser.id, updatePayload);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profil mis à jour avec succès',
          passwordChanged: !!updatePayload.password,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (updateError) {
      const errorMsg =
        updateError instanceof Error
          ? updateError.message
          : 'Erreur lors de la mise à jour';
      return createErrorResponse(errorMsg, 500, isDevelopment);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Une erreur serveur est survenue';
    return createErrorResponse(errorMsg, 500, isDevelopment);
  }
};
