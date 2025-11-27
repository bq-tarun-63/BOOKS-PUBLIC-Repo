import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

type User = { email: string; name?: string; image?: string } | null;

type AuthContextType = {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  addAuthHeaders: (headers?: HeadersInit) => Promise<HeadersInit>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  addAuthHeaders: async (h) => h || {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await SecureStore.getItemAsync("auth_user");
      if (u) setUser(JSON.parse(u));
      setIsLoading(false);
    })();
  }, []);

  async function logout() {
    await SecureStore.deleteItemAsync("auth_user");
    setUser(null);
  }

  async function addAuthHeaders(headers: HeadersInit = {}) {
    const h = new Headers(headers as any);
    const u = await SecureStore.getItemAsync("auth_user");
    if (u) {
      const parsed = JSON.parse(u) as { email?: string; name?: string; image?: string };
      if (parsed.email) {
        h.set("x-user-email", parsed.email);
        if (parsed.name) h.set("x-user-name", parsed.name);
        if (parsed.image) h.set("x-user-image", parsed.image);
      }
    }
    return h;
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout, addAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

