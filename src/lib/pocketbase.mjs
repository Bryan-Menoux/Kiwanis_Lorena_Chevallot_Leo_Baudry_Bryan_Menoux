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

export async function authenticateUser(email, password) {
    console.log("Authenticating user with email:", email);
    console.log("Using PocketBase URL:", pb.baseUrl);
    try {
        const authData = await pb.collection("users").authWithPassword(email, password);
        console.log("Authentication success:", authData);
        return authData;
    } catch (error) {
        console.error("Error authenticating user:", error);
        console.error("Error details:", error.status, error.response);
        throw error;
    }
}