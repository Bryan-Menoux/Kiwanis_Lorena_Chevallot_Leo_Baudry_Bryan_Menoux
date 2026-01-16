import PocketBase from "pocketbase";

const isBrowser = typeof window !== "undefined";
const PUBLIC_PB_URL = "https://kiwanis-pays-de-montbeliard.bryan-menoux.fr/";
const INTERNAL_URL = "http://127.0.0.1:8086";
const DEV_URL = "http://127.0.0.1:8090";

const envUrl =
  typeof process !== "undefined" && process.env?.POCKETBASE_URL
    ? process.env.POCKETBASE_URL
    : null;

const isDevMode = import.meta.env.DEV;

const baseUrl = isBrowser
  ? (isDevMode ? DEV_URL : PUBLIC_PB_URL)
  : envUrl || (isDevMode ? DEV_URL : INTERNAL_URL);

console.log("PocketBase URL:", baseUrl, "| Dev Mode:", isDevMode, "| Is Browser:", isBrowser);

export const pb = new PocketBase(baseUrl);

export async function createUser(data) {
  try {
    const newUser = await pb.collection("users").create(data);
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// connection de l'utilisateur avec option rester connecté
export async function authenticateUser(email, password) {
  try {
    const authData = await pb.collection("users").authWithPassword(email, password);
    
    // Vérifier si l'utilisateur est vérifié
    if (!authData.record.verified) {
      pb.authStore.clear(); // Déconnexion de l'utilisateur non vérifié
      const error = new Error("Votre compte est en attente de validation par un administrateur.");
      error.errorType = "warning";
      throw error;
    }
    
    return authData;
  } catch (error) {
    // Traduire les erreurs PocketBase en français
    if (error.errorType === "warning") {
      throw error;
    }
    
    // Erreur d'authentification (identifiants incorrects)
    if (error.status === 400 || error.message?.includes("Failed to authenticate")) {
      const authError = new Error("Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.");
      authError.errorType = "error";
      throw authError;
    }
    
    // Autres erreurs
    const genericError = new Error("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
    genericError.errorType = "error";
    throw genericError;
  }
}