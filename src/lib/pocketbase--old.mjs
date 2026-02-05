import PocketBase from "pocketbase";
import dotenv from "dotenv";

if (typeof process !== "undefined" && process.env) {
  dotenv.config();
}

const isBrowser = typeof window !== "undefined";
const PUBLIC_PB_URL = "https://pb-kiwanis.bryan-menoux.fr";
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

export const pb = new PocketBase(baseUrl);
