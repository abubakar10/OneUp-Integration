/** Base URL for API calls (no trailing slash). Controllers use /api/... */
export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:5216/api";
  return "https://oneupbackend-adayd2a6bghba2ds.eastasia-01.azurewebsites.net/api";
}
