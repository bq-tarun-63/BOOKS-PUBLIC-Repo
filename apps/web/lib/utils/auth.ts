import { NextRequest } from "next/server";
import { IUser } from "@/models/types/User";

/**
 * PUBLIC SERVER - No authentication
 * This is a stub file that maintains type compatibility
 */

export interface AuthResult {
  user: IUser;
  session: any;
  workspaceId?: string;
}

export interface AuthError {
  error: string;
  status: 401 | 404;
}

export interface AuthOptions {
  includeWorkspace?: boolean;
  createUserIfNotFound?: boolean;
}

/**
 * Public server stub - always returns unauthorized error
 * APIs should not rely on authentication on public server
 */
export async function getAuthenticatedUser(
  req?: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult | AuthError> {
  console.warn("getAuthenticatedUser called on public server - returning unauthorized");
  return {
    error: "Public server does not support authentication",
    status: 401,
  };
}

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(auth: AuthResult | AuthError): auth is AuthError {
  return 'error' in auth;
}

