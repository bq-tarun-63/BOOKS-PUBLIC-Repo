import * as SecureStore from "expo-secure-store";
import { NEXTAUTH_API_URL } from "@/lib/config";

export async function addAuthHeaders(headers: HeadersInit = {}) {
  const userJson = await SecureStore.getItemAsync("auth_user");
  const h = new Headers(headers as any);
  if (userJson) {
    try {
      const user = JSON.parse(userJson) as { email?: string; name?: string; image?: string };
      if (user.email) {
        h.set("x-user-email", user.email);
        if (user.name) h.set("x-user-name", user.name);
        if (user.image) h.set("x-user-image", user.image);
      }
    } catch {}
  }
  return h;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = await addAuthHeaders(options.headers);
  return fetch(url, { ...options, headers });
}

export async function getWithAuth<T>(url: string, options: RequestInit = {}) {
  const res = await fetchWithAuth(url, { ...options, method: "GET" });
  if (res.status === 401) {
    throw new Error(`Unauthorized. Please sign in at ${NEXTAUTH_API_URL}`);
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

