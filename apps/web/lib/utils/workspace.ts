import CryptoJS from "crypto-js";
import type { NextRequest } from "next/server";

const secret = process.env.NEXT_PUBLIC_CJS_TOKEN;

/**
 * Extracts and decrypts the workspace ID from the encrypted workspace cookie.
 * 
 * @param req - The Next.js request object containing cookies
 * @returns The decrypted workspace ID string, or empty string if cookie is missing/invalid
 * 
 * @example
 * ```typescript
 * const workspaceId = getWorkspaceIdFromCookie(req);
 * if (!workspaceId) {
 *   return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
 * }
 * ```
 */
export function getWorkspaceIdFromCookie(req: NextRequest): string {
  const workspaceCookie = req.cookies.get("workspace")?.value;
  
  if (!workspaceCookie) {
    return "";
  }

  try {
    const bytes = CryptoJS.AES.decrypt(
      decodeURIComponent(workspaceCookie),
      secret || ""
    );
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData.workspaceId ;
  } catch (err) {
    console.error("Invalid or corrupted workspace cookie", err);
    return "";
  }
}

