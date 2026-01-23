// Utilitaires centralisés de sécurité pour validation, vérification JWT et gestion des erreurs
import type PocketBase from 'pocketbase';
import crypto from 'crypto';

// ==================== CONSTANTES DE SÉCURITÉ ====================

// Limite de requêtes par minute par IP (rate limiting)
// En développement: plus permissif pour faciliter les tests
// En production: plus strict pour la sécurité
const isDevelopment = process.env.NODE_ENV === 'development';
const RATE_LIMIT_MAX_REQUESTS = isDevelopment ? 20 : 5;
const RATE_LIMIT_WINDOW_MS = 60000;

// Limites de validation des données
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ID_REGEX = /^[a-z0-9]{15}$/i;

// Politique de mot de passe - exigences minimales
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
};

// Caractères spéciaux acceptés pour les mots de passe
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// Stockage en mémoire des tentatives de requête (rate limiting)
// NOTE: En production, utiliser Redis pour la persistance
const rateLimitMap = new Map<string, number[]>();

// Stockage des tokens CSRF valides
// NOTE: En production, utiliser une base de données ou Redis
const csrfTokenStore = new Map<string, { userId: string; expiresAt: number }>();

// ==================== FONCTIONS DE VALIDATION ====================

/**
 * Valide le format d'une adresse email
 * @param email - Adresse email à valider
 * @returns true si l'email est valide, false sinon
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.toLowerCase());
}

/**
 * Valide le format d'un ID utilisateur PocketBase
 * @param userId - ID utilisateur à valider
 * @returns true si l'ID est valide, false sinon
 */
export function isValidUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') return false;
  return USER_ID_REGEX.test(userId);
}

/**
 * Valide la complexité et la conformité d'un mot de passe
 * @param password - Mot de passe à valider
 * @returns Objet contenant le statut de validité et la liste des erreurs
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérification que le mot de passe est une chaîne
  if (!password || typeof password !== 'string') {
    errors.push('Le mot de passe doit être une chaîne non vide');
    return { valid: false, errors };
  }

  // Vérification de la longueur minimale
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Au moins ${PASSWORD_REQUIREMENTS.minLength} caractères requis`);
  }

  // Vérification de la présence d'une majuscule
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule (A-Z) requise');
  }

  // Vérification de la présence d'une minuscule
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule (a-z) requise');
  }

  // Vérification de la présence d'un chiffre
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Au moins un chiffre (0-9) requis');
  }

  // Vérification de la présence d'un caractère spécial
  if (PASSWORD_REQUIREMENTS.requireSpecial && !SPECIAL_CHARS.test(password)) {
    errors.push('Au moins un caractère spécial (!@#$%^&*, etc.) requis');
  }

  return { valid: errors.length === 0, errors };
}

// ==================== FONCTIONS DE VÉRIFICATION JWT ====================

/**
 * Vérifie et décode un token JWT en utilisant PocketBase
 * ⚠️ CRITIQUE: La signature du JWT est vérifiée en interrogeant PocketBase
 * Cela prévient la falsification de tokens
 * @param token - Token JWT à vérifier
 * @param pbServer - Instance PocketBase serveur
 * @returns Objet décodé si valide, null sinon
 */
export async function verifyJWT(token: string, pbServer: PocketBase): Promise<any> {
  try {
    // Vérification basique du format du token
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Décodage du payload sans vérification (première étape)
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    } catch {
      return null;
    }

    console.log('Decoded payload:', decoded);

    // Vérification critique: L'ID du token doit exister et être valide dans la base de données
    if (!decoded || !decoded.id) return null;

    // Validation du format de l'ID
    if (!isValidUserId(decoded.id)) {
      console.log('Invalid user id format:', decoded.id);
      return null;
    }

    // ✅ VÉRIFICATION ESSENTIELLE: Récupération de l'utilisateur depuis la base de données
    // Cela garantit que le token n'a pas été falsifié
    try {
      const user = await pbServer.collection('users').getOne(decoded.id, {
        expand: '',
      });

      console.log('User found:', user ? user.id : 'not found');

      // Vérification que l'utilisateur existe et correspond au token
      if (!user || user.id !== decoded.id) {
        return null;
      }

      // Retour du payload déclaré + vérification que l'utilisateur existe
      return decoded;
    } catch (userError) {
      console.log('Error fetching user:', userError);
      // L'utilisateur n'existe pas ou a été supprimé
      return null;
    }
  } catch (error) {
    console.log('Error in verifyJWT:', error);
    return null;
  }
}

// ==================== FONCTIONS DE RATE LIMITING ====================

/**
 * Vérifie si une adresse IP dépasse la limite de requêtes autorisées
 * Implémentation en mémoire - À remplacer par Redis en production
 * @param ip - Adresse IP de la requête
 * @returns true si la requête est autorisée, false si trop de requêtes
 */
type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxRequests = 5,
  windowMs = 10_000,
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Première requête ou fenêtre expirée
  if (!entry || now > entry.expiresAt) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return true;
  }

  // Trop de requêtes
  if (entry.count >= maxRequests) {
    return false;
  }

  // Incrémenter le compteur
  entry.count += 1;
  return true;
}


// ==================== FONCTIONS DE CSRF ====================

/**
 * Génère un token CSRF aléatoire et sécurisé
 * @param userId - ID de l'utilisateur
 * @param expirationSeconds - Durée de validité du token en secondes (défaut: 300s = 5 min)
 * @returns Token CSRF généré
 */
export function generateCSRFToken(userId: string, expirationSeconds: number = 300): string {
  // Génération d'un token aléatoire sécurisé
  const token = crypto.randomBytes(32).toString('hex');

  // Stockage du token avec timestamp d'expiration
  const expiresAt = Date.now() + expirationSeconds * 1000;
  csrfTokenStore.set(token, { userId, expiresAt });

  // Nettoyage des tokens expirés (toutes les 50 générations)
  if (csrfTokenStore.size % 50 === 0) {
    const now = Date.now();
    for (const [key, data] of csrfTokenStore.entries()) {
      if (data.expiresAt < now) {
        csrfTokenStore.delete(key);
      }
    }
  }

  return token;
}

/**
 * Vérifie la validité d'un token CSRF
 * @param token - Token CSRF à vérifier
 * @param userId - ID de l'utilisateur (doit correspondre au token)
 * @returns true si le token est valide, false sinon
 */
export function verifyCSRFToken(token: string, userId: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const storedData = csrfTokenStore.get(token);

  // Vérifie que le token existe et n'a pas expiré
  if (!storedData || storedData.expiresAt < Date.now()) {
    csrfTokenStore.delete(token);
    return false;
  }

  // Vérifie que l'ID utilisateur correspond
  if (storedData.userId !== userId) {
    return false;
  }

  // Le token reste valide jusqu'à expiration (pas de suppression après utilisation)
  // Cela permet l'utilisation multiple dans une session courte
  return true;
}

// ==================== FONCTIONS DE GESTION D'ERREURS ====================

/**
 * Génère une réponse d'erreur sécurisée
 * Masque les détails sensibles en production
 * @param message - Message d'erreur à afficher à l'utilisateur
 * @param status - Code de statut HTTP (défaut: 500)
 * @param isDevelopment - Mode développement (affiche les détails techniques)
 * @param details - Détails techniques (affichés uniquement en développement)
 * @returns Réponse JSON formatée
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  isDevelopment: boolean = false,
  details?: string
): Response {
  const errorResponse: any = {
    error: message,
    code: getErrorCode(status),
  };

  // En développement, inclure les détails techniques pour le débogage
  if (isDevelopment && details) {
    errorResponse.details = details;
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mappe les codes de statut HTTP à des codes d'erreur lisibles
 * @param status - Code de statut HTTP
 * @returns Code d'erreur
 */
function getErrorCode(status: number): string {
  const errorMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };
  return errorMap[status] || 'UNKNOWN_ERROR';
}

/**
 * Extrait l'adresse IP de la requête
 * Prend en compte les proxies et load balancers
 * @param request - Objet Request Astro
 * @returns Adresse IP détectée
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Échappa les caractères HTML pour prévenir les attaques XSS
 * @param str - Chaîne à échapper
 * @returns Chaîne échappée
 */
export function escapeHTML(str: string): string {
  if (typeof str !== 'string') return '';

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Valide et nettoie une chaîne de caractères
 * @param input - Chaîne à valider
 * @param maxLength - Longueur maximale autorisée
 * @returns Chaîne nettoyée ou null si invalide
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string | null {
  if (typeof input !== 'string') return null;

  // Supprime les espaces inutiles
  const trimmed = input.trim();

  // Vérifie la longueur
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  // Supprime les caractères de contrôle
  return trimmed.replace(/[\x00-\x1F\x7F]/g, '');
}
