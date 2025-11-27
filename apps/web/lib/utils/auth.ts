import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { UserService } from "@/services/userService";
import { getWorkspaceIdFromCookie } from "./workspace";
import { IUser } from "@/models/types/User";
import type { Session } from "next-auth";

/**
 * Response type for authentication helper
 */
export interface AuthResult {
  user: IUser;
  session: Session;
  workspaceId?: string;
}

/**
 * Error response for authentication failures
 */
export interface AuthError {
  error: string;
  status: 401 | 404;
}

/**
 * Options for authentication helper
 */
export interface AuthOptions {
  /**
   * Whether to fetch and decrypt workspaceId from cookies (OPTIONAL)
   * @default false
   */
  includeWorkspace?: boolean;
  
  /**
   * Whether to create user if not found (uses findOrCreateUserFromSession)
   * @default false
   */
  createUserIfNotFound?: boolean;
}

/**
 * Note: Session and User checks are ALWAYS performed.
 * Only workspaceId from cookies is optional (via includeWorkspace flag).
 */

/**
 * Comprehensive authentication helper that validates session and fetches user
 * 
 * @param req - Next.js request object (optional, only needed if includeWorkspace is true)
 * @param options - Configuration options
 * @returns Object containing user, session, and optionally workspaceId, or error object
 * 
 * @example
 * // Basic usage (just session + user)
 * const auth = await getAuthenticatedUser();
 * if ('error' in auth) {
 *   return NextResponse.json({ message: auth.error }, { status: auth.status });
 * }
 * const { user, session } = auth;
 * 
 * @example
 * // With workspace from cookie
 * const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
 * if ('error' in auth) {
 *   return NextResponse.json({ message: auth.error }, { status: auth.status });
 * }
 * const { user, session, workspaceId } = auth;
 * 
 * @example
 * // Create user if not found
 * const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
 * if ('error' in auth) {
 *   return NextResponse.json({ message: auth.error }, { status: auth.status });
 * }
 * const { user, session } = auth;
 */
export async function getAuthenticatedUser(
  req?: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult | AuthError> {
  const { includeWorkspace = false, createUserIfNotFound = false } = options;

  // 1. Check session
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  // 2. Get or create user from database
  let user: IUser | null = null;

  if (createUserIfNotFound) {
    // Use findOrCreateUserFromSession to ensure user exists
    user = await UserService.findOrCreateUserFromSession({
      session: {
        email: session.user.email,
        name: session.user.name || "",
        image: session.user.image || "",
      },
    });
  } else {
    // Just find existing user
    user = await UserService.findUserByEmail({ email: session.user.email });
  }

  if (!user || !user.id) {
    return {
      error: "User not found",
      status: 404,
    };
  }

  // 3. Get workspace from cookie if requested
  let workspaceId: string= "";
  if (includeWorkspace) {
    if (!req) {
      throw new Error("Request object is required");
    } else {
      workspaceId = getWorkspaceIdFromCookie(req);
      if (!workspaceId) {
        throw new Error("WorkspaceID is required");
      
      }
    }
  }

  return {
    user,
    session,
    ...(includeWorkspace && { workspaceId }),
  };
}

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(auth: AuthResult | AuthError): auth is AuthError {
  return 'error' in auth;
}

