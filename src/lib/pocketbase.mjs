// Module principal pour l'interaction avec PocketBase
import PocketBase from "pocketbase";
import dotenv from "dotenv";

// Chargement des variables d'environnement
if (typeof process !== "undefined" && process.env) {
  dotenv.config();
}

// Configuration des URLs selon l'environnement
// PocketBase nécessite des URLs différentes selon le contexte :
// - Browser : utilise l'URL publique en prod, localhost en dev
// - Server : utilise l'URL interne ou celle des variables d'environnement
const isBrowser = typeof window !== "undefined";
const PUBLIC_PB_URL = "https://pb-kiwanis.bryan-menoux.fr";
const INTERNAL_URL = "http://127.0.0.1:8086"; // Port interne pour le serveur
const DEV_URL = "http://127.0.0.1:8090"; // Port de développement

const envUrl =
  typeof process !== "undefined" && process.env?.POCKETBASE_URL
    ? process.env.POCKETBASE_URL
    : null;

const isDevMode = import.meta.env.DEV;

// Logique de sélection d'URL : côté client utilise toujours l'URL publique en prod
const baseUrl = isBrowser
  ? (isDevMode ? DEV_URL : PUBLIC_PB_URL)
  : envUrl || (isDevMode ? DEV_URL : INTERNAL_URL);

// Instance principale de PocketBase pour le client
// Cette instance gère automatiquement l'authentification et le stockage local
export const pb = new PocketBase(baseUrl);

// Fonction pour créer une instance PocketBase côté serveur avec authentification admin
// Nécessaire pour les opérations serveur qui requièrent des droits élevés
// Utilise la collection spéciale '_superusers' pour l'authentification admin
export async function getPbServerInstance() {
  try {
    const pbUrl = typeof process !== 'undefined' && process.env?.POCKETBASE_URL
      ? process.env.POCKETBASE_URL
      : (isDevMode ? DEV_URL : INTERNAL_URL);

    const pbServer = new PocketBase(pbUrl);
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes: POCKETBASE_ADMIN_EMAIL ou POCKETBASE_ADMIN_PASSWORD');
    }

    // Authentification en tant que super utilisateur pour les opérations admin
    await pbServer.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    return pbServer;
  } catch (error) {
    throw error;
  }
}

// Fonction pour créer un nouvel utilisateur
// Utilise la collection 'users' par défaut de PocketBase
export async function createUser(data) {
  try {
    const newUser = await pb.collection("users").create(data);
    return newUser;
  } catch (error) {
    throw error;
  }
}

// Fonction pour authentifier un utilisateur
// Vérifie automatiquement le champ 'verified' de PocketBase
// qui indique si l'utilisateur a été validé par un admin
export async function authenticateUser(email, password) {
  try {
    // authWithPassword() de PocketBase gère automatiquement le stockage du token
    const authData = await pb.collection("users").authWithPassword(email, password);

    // Vérification du statut de vérification (champ spécifique à PocketBase)
    if (!authData.record.verified) {
      // Nettoie le store d'authentification si non vérifié
      pb.authStore.clear();
      const error = new Error("Votre compte est en attente de validation par un administrateur.");
      error.errorType = "warning";
      throw error;
    }

    return authData;
  } catch (error) {
    if (error.errorType === "warning") {
      throw error;
    }

    // Gestion spécifique des erreurs HTTP de PocketBase (400 = bad request)
    if (error.status === 400 || error.message?.includes("Failed to authenticate")) {
      const authError = new Error("Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.");
      authError.errorType = "error";
      throw authError;
    }

    const genericError = new Error("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
    genericError.errorType = "error";
    throw genericError;
  }
}

// Fonction pour vérifier si l'utilisateur est authentifié
// Utilise le authStore de PocketBase qui gère automatiquement la validité du token
export function isUserAuthenticated() {
  return pb.authStore.isValid && !!pb.authStore.record?.id;
}

// Fonction pour mettre à jour le profil utilisateur
// Utilise une approche fetch API au lieu des méthodes PocketBase directes
// car la mise à jour de mot de passe nécessite une validation côté serveur
export async function updateUserProfile(data) {
  try {
    if (!isBrowser) {
      throw new Error("Cette fonction doit être exécutée côté client");
    }

    // Récupération du token JWT depuis le store PocketBase
    const token = pb.authStore.token;
    if (!token) {
      throw new Error("Utilisateur non authentifié");
    }

    // Construction du payload selon les champs fournis
    const updatePayload = {};
    if (data.name) updatePayload.name = data.name;
    if (data.password) {
      // PocketBase nécessite ces trois champs pour changer le mot de passe
      updatePayload.password = data.password;
      updatePayload.passwordConfirm = data.passwordConfirm;
      updatePayload.oldPassword = data.oldPassword;
    }

    // Appel à l'API personnalisée pour gérer la logique métier
    const response = await fetch('/api/update-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Utilisation du token JWT dans l'header Authorization
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la mise à jour');
    }

    const result = await response.json();

    // Gestion spécifique du changement de mot de passe
    if (result.passwordChanged) {
      // Nettoyage du store d'authentification après changement de mot de passe
      pb.authStore.clear();
      if (typeof window !== "undefined") {
        localStorage.removeItem('pocketbase_auth');
        // Redirection après un délai pour permettre à l'utilisateur de voir le message
        setTimeout(() => {
          window.location.href = '/connexion';
        }, 1500);
      }
      return { passwordChanged: true };
    }

    // Mise à jour du store avec les nouvelles données utilisateur
    const updatedUser = result.user;
    pb.authStore.save(pb.authStore.token, updatedUser);
    return updatedUser;
  } catch (error) {
    let errorMessage = error.message || 'Erreur lors de la mise à jour.';

    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

// Fonction pour recuperer l'utilisateur actuel
// Ajoute une propriete 'nameParts' pour faciliter l'affichage du nom/prenom
export function getCurrentUser() {
  const user = pb.authStore.record;
  if (!user) return;

  // Division du nom complet en parties (utile pour l'affichage)
  user.nameParts = user.name ? user.name.split(" ") : ["", ""];
  return user;
}

// Fonction pour recuperer les donnees completes de l'utilisateur
// NOTE: Retourne les donnees mises en cache dans pb.authStore
// Les appels API directs vers PocketBase sont bloques pour des raisons de securite (403 Forbidden)
// Pour recuperer des donnees fraiches, creez un endpoint API cote serveur
export async function getUserData() {
  try {
    if (!isUserAuthenticated()) {
      return null;
    }

    // Retour des donnees mises en cache dans authStore
    // C'est l'UNIQUE source de verite cote client pour eviter les 403 Forbidden
    return pb.authStore.record || null;
  } catch (error) {
    throw error;
  }
}

// Fonction pour déconnecter l'utilisateur
// Nettoie le store d'authentification de PocketBase et le localStorage
export function logoutUser() {
  pb.authStore.clear();
  if (typeof window !== "undefined") {
    localStorage.removeItem('pocketbase_auth');
  }
}

// Fonction pour vérifier si l'utilisateur est administrateur
// Vérifie le champ personnalisé 'administrateur' ajouté à la collection users
// ⚠️ NOTE: Cette fonction fonctionne UNIQUEMENT avec les données mises en cache dans pb.authStore
// Les appels API directs vers PocketBase sont bloqués pour des raisons de sécurité
export async function isUserAdmin() {
  try {
    if (!isUserAuthenticated()) {
      return false;
    }

    const userRecord = pb.authStore.record;
    // Retour du champ 'administrateur' depuis le cache du store
    // C'est l'UNIQUE source de vérité côté client pour éviter les 403 Forbidden
    if (userRecord && userRecord.administrateur !== undefined) {
      return userRecord.administrateur === true;
    }

    // Si le champ administrateur n'existe pas en cache, c'est que l'utilisateur n'est pas admin
    return false;
  }
  catch (error) {
    // Log silencieux pour éviter la pollution console
    // L'erreur est probablement due à authStore vide ou session expirée
    return false;
  }
}

// Fonction pour récupérer les utilisateurs non vérifiés
// Utilise getFullList() avec un filtre PocketBase pour les utilisateurs en attente
export async function getUnverifiedUsers() {
  try {




    
const pbUrl = process.env.POCKETBASE_URL || DEV_URL;

    
const pbSuperuser = new PocketBase(pbUrl);

    
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes: POCKETBASE_ADMIN_EMAIL ou POCKETBASE_ADMIN_PASSWORD');
    }
    
    const superuserAuth = await pbSuperuser.collection('_superusers').authWithPassword(
      adminEmail,
      adminPassword
    );
    


    
    // Filtre PocketBase : utilisateurs non vérifiés ET non rejetés, triés par date de création
    const records = await pbSuperuser.collection('users').getFullList({
      filter: 'verified = false && rejected != true',
      sort: '-created'  // Tri décroissant par date de création
    });
    
    return records;
    
  } catch (error) {




    if (error.data) {

    }

    throw error;
  }
}

// Fonction pour vérifier un utilisateur (réservée aux admins)
// Met à jour le champ 'verified' à true via update() de PocketBase
export async function verifyUser(userId) {
  try {


    const currentUser = pb.authStore.record;
    const isAdminAndVerified = currentUser?.administrateur === true && currentUser?.verified === true;
    
    if (!isAdminAndVerified) {
      throw new Error("Accès refusé : droits administrateur + verified requis");
    }

    const pbUrl = process.env.POCKETBASE_URL || DEV_URL;
    const pbSuperuser = new PocketBase(pbUrl);
    
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes: POCKETBASE_ADMIN_EMAIL ou POCKETBASE_ADMIN_PASSWORD');
    }
    
    await pbSuperuser.collection('_superusers').authWithPassword(
      adminEmail,
      adminPassword
    );
    


    // Mise à jour du champ 'verified' à true via la méthode update() de PocketBase
    const updatedUser = await pbSuperuser.collection('users').update(userId, {
      verified: true
    });
    

    return updatedUser;

  } catch (error) {

    throw error;
  }
}

// Fonction pour rejeter un utilisateur (réservée aux admins)
// Supprime définitivement l'utilisateur via delete() de PocketBase
export async function rejectUser(userId) {
  try {
    if (!isUserAuthenticated()) {
      throw new Error("Utilisateur non authentifié");
    }

    const currentUser = pb.authStore.record;
    if (!currentUser.administrateur || !currentUser.verified) {
      throw new Error("Accès refusé : droits administrateur + verified requis");
    }

    const pbUrl = process.env.POCKETBASE_URL || DEV_URL;
    const pbSuperuser = new PocketBase(pbUrl);
    
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes: POCKETBASE_ADMIN_EMAIL ou POCKETBASE_ADMIN_PASSWORD');
    }
    
    await pbSuperuser.collection('_superusers').authWithPassword(
      adminEmail,
      adminPassword
    );
    


    // Suppression définitive de l'utilisateur via delete() de PocketBase
    await pbSuperuser.collection("users").delete(userId);
    

    return true;
  } catch (error) {

    throw error;
  }
}

// Fonction pour récupérer les utilisateurs rejetés
// Filtre PocketBase pour les utilisateurs marqués comme rejetés
export async function getRejectedUsers() {
  try {

    
    const pbUrl = process.env.POCKETBASE_URL || DEV_URL;
    const pbSuperuser = new PocketBase(pbUrl);
    
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes');
    }
    
    await pbSuperuser.collection('_superusers').authWithPassword(adminEmail, adminPassword);

    
    // Filtre PocketBase pour les utilisateurs rejetés, triés par date de rejet
    const records = await pbSuperuser.collection('users').getFullList({
      filter: 'rejected = true',
      sort: '-rejectionDate'  // Tri par date de rejet décroissante
    });
    

    return records;
    
  } catch (error) {
    return [];
  }
}

// Fonction pour supprimer tous les utilisateurs rejetés
// Opération de suppression en masse avec gestion d'erreurs individuelles
export async function deleteAllRejectedUsers() {
  try {

    
    const pbUrl = process.env.POCKETBASE_URL || DEV_URL;
    const pbSuperuser = new PocketBase(pbUrl);
    
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Variables d\'environnement manquantes');
    }
    
    await pbSuperuser.collection('_superusers').authWithPassword(adminEmail, adminPassword);

    
    // Récupération de tous les utilisateurs rejetés pour suppression en masse
    const rejectedUsers = await pbSuperuser.collection('users').getFullList({
      filter: 'rejected = true'
    });
    
    let deleted = 0;
    // Suppression individuelle avec gestion d'erreurs pour éviter qu'une erreur stoppe tout
    for (const user of rejectedUsers) {
      try {
        await pbSuperuser.collection('users').delete(user.id);
        deleted++;
      } catch (e) {
        // Erreur silencieuse pour continuer la suppression des autres utilisateurs
      }
    }
    


    return { success: true, deleted };
    
  } catch (error) {

    throw error;
  }
}

