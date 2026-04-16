const DEFAULT_PROD_API_BASE = "https://ruraltriage-api-production.up.railway.app";

const normalizeBase = (url: string) => url.trim().replace(/\/+$/, "");

type RuntimeEnv = {
  VITE_API_URL?: string;
  VITE_WS_URL?: string;
  PROD?: boolean;
};

const runtimeEnv = ((import.meta as ImportMeta & { env?: RuntimeEnv }).env ?? {}) as RuntimeEnv;

const envApiBase = runtimeEnv.VITE_API_URL ? normalizeBase(runtimeEnv.VITE_API_URL) : "";

export const API_BASE_URL = envApiBase || (runtimeEnv.PROD ? DEFAULT_PROD_API_BASE : "");

const envWsBase = runtimeEnv.VITE_WS_URL ? normalizeBase(runtimeEnv.VITE_WS_URL) : "";

// Fallback logic for development vs production
let derivedWsBase = API_BASE_URL ? API_BASE_URL.replace(/^http/, "ws") : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

// In local development (localhost), if no API_BASE is provided, default to backend port 8000
if (window.location.hostname === "localhost" && !API_BASE_URL) {
  derivedWsBase = `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:8000`;
}

export const WS_BASE_URL = envWsBase || derivedWsBase;

export function toApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    return path;
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function toWsUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${WS_BASE_URL}${normalizedPath}`;
}
