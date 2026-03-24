const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();

const API_BASE = RAW_API_BASE.endsWith("/")
  ? RAW_API_BASE.slice(0, -1)
  : RAW_API_BASE;

export function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) {
    return `/api${cleanPath}`;
  }
  return `${API_BASE}${cleanPath}`;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
