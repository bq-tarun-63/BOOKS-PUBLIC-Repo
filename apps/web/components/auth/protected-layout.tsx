"use client";

import { useAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";
import AuthLoading from "./loading";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <AuthLoading />;
  }

  // If not authenticated, the auth provider will redirect to login
  // This is just a fallback in case something goes wrong
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
