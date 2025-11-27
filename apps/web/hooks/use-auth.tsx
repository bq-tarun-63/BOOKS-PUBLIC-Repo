import { type ReactNode, createContext, useContext } from "react";

type User = {
  email: string;
  name?: string;
  image?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  logout: () => void;
  addAuthHeaders: (headers?: HeadersInit) => HeadersInit;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  logout: () => {},
  addAuthHeaders: () => ({}),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Public server - no authentication
  const logout = () => {
    console.log("Logout called on public server (no-op)");
  };

  const addAuthHeaders = (headers: HeadersInit = {}) => {
    // Public server - no auth headers
    return headers;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        isLoading: false,
        user: null,
        logout,
        addAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
