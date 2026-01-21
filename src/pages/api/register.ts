// Endpoint API pour l'inscription d'un nouvel utilisateur
// Valide les données d'entrée, applique la politique de mot de passe et crée un nouvel utilisateur
import type { APIRoute } from 'astro';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
import {
  isValidEmail,
  validatePassword,
  createErrorResponse,
  getClientIP,
  checkRateLimit,
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

export const POST: APIRoute = async ({ request }) => {
  try {
    // Vérification de la méthode HTTP
    if (request.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Vérification du rate limiting pour prévenir les abus
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return createErrorResponse('Trop de requêtes - veuillez réessayer plus tard', 429);
    }

    // Parsing du corps de la requête
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse('Invalid JSON', 400);
    }

    // Extraction et nettoyage des données du formulaire
    const email = sanitizeString(body.email);
    const password = body.password;
    const passwordConfirm = body.passwordConfirm;
    const name = sanitizeString(body.name, 100);

    // Validation des champs requis
    if (!email || !password || !passwordConfirm || !name) {
      return createErrorResponse('Tous les champs requis doivent être fournis', 400);
    }

    // Validation du format de l'email
    if (!isValidEmail(email)) {
      return createErrorResponse('Format d\'adresse email invalide', 400);
    }

    // Vérification que les mots de passe correspondent
    if (password !== passwordConfirm) {
      return createErrorResponse('Les mots de passe ne correspondent pas', 400);
    }

    // Validation de la complexité du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return createErrorResponse(
        `Mot de passe insuffisamment complexe: ${passwordValidation.errors.join(', ')}`,
        400
      );
    }

    // Création de l'instance PocketBase côté serveur
    const pbServer = await getPbServerInstance();

    // Création du nouvel utilisateur dans la base de données
    try {
      const newUser = await pbServer.collection('users').create({
        email,
        password,
        passwordConfirm,
        name,
        verified: false,
        administrateur: false,
      });

      // Réponse de succès
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur enregistré avec succès',
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (pbError: any) {
      // Gestion des erreurs de PocketBase (doublons, etc.)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorMsg =
        pbError?.data?.data?.email?.code === 'invalid_format'
          ? 'Email invalide'
          : pbError?.data?.data?.email?.code === 'invalid_account'
            ? 'Cet email est déjà utilisé'
            : 'Erreur lors de l\'enregistrement';

      return createErrorResponse(errorMsg, pbError.status || 500, isDevelopment, pbError.message);
    }
  } catch (error: any) {
    // Gestion des erreurs inattendues
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMsg = isDevelopment ? error?.message : 'Une erreur serveur est survenue';

    return createErrorResponse(errorMsg, 500, isDevelopment);
  }
};
