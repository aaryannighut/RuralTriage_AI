const DEFAULT_PROD_API_BASE = "https://ruraltriage-api-production.up.railway.app";

const normalizeBase = (url?: string) => url?.trim().replace(/\/+$/, "") || "";

// Explicitly access import.meta.env properties for Vite's static replacement.
// Dynamic access like import.meta.env[key] will NOT be replaced at build time.
const envApiUrl = import.meta.env.VITE_API_URL;
const envWsUrl = import.meta.env.VITE_WS_URL;
const isProd = import.meta.env.PROD;

const isLocalhost = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.endsWith(".ngrok-free.dev"));

export const API_BASE_URL = isLocalhost ? "" : (normalizeBase(envApiUrl) || (isProd ? DEFAULT_PROD_API_BASE : ""));

// Fallback logic for development vs production
let derivedWsBase = API_BASE_URL ? API_BASE_URL.replace(/^http/, "ws") : "";

// In local development (localhost), if no API_BASE is provided, default to backend port 8000
if (typeof window !== "undefined" && window.location.hostname === "localhost" && !API_BASE_URL) {
  derivedWsBase = `ws://localhost:8000`;
}

export const WS_BASE_URL = normalizeBase(envWsUrl) || derivedWsBase;

export function toApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    return path;
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function toWsUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!WS_BASE_URL) return normalizedPath;
  return `${WS_BASE_URL}${normalizedPath}`;
}
