/** Base URL for API calls (no trailing slash). Controllers use /api/... */
export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:5216/api";
  return "https://sales-backend-d3cpf8b4e4byd8f4.uaenorth-01.azurewebsites.net/api";
}
