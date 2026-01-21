// Endpoint API pour générer un token CSRF valide
// Les tokens CSRF sont uniques, aléatoires et expirables pour prévenir les attaques CSRF
// Ce token doit être inclus dans toutes les requêtes POST/PUT/DELETE pour vérifier l'authenticité
import type { APIRoute } from 'astro';
import { generateCSRFToken, verifyJWT } from '../../lib/security';
import { getPbServerInstance } from '../../lib/pocketbase.mjs';
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
    // Vérification de l'authentification via le token JWT dans l'en-tête Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const pbServer = await getPbServerInstance();

    // ✅ VÉRIFICATION CRITIQUE: Vérification du token JWT côté serveur pour s'assurer de l'authenticité
    const decoded = await verifyJWT(token, pbServer);
    if (!decoded || !decoded.id) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Génération d'un nouveau token CSRF aléatoire et sécurisé lié à l'utilisateur
    // Le token expire après 5 minutes pour limiter les risques en cas de fuite
    const csrfToken = generateCSRFToken(decoded.id, 300); // Valide 5 minutes

    return new Response(
      JSON.stringify({
        success: true,
        csrfToken,
        expiresIn: 300, // en secondes
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Gestion sécurisée des erreurs : ne pas exposer les détails en production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMsg = isDevelopment
      ? error instanceof Error
        ? error.message
        : 'Erreur inconnue'
      : 'Une erreur serveur est survenue';

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
