import { App } from "octokit";
import { Octokit } from "@octokit/rest";
import crypto from "crypto";
import dotenv from "dotenv";

// Ensure .env is loaded
dotenv.config();

const appId = process.env.GITHUB_APP_ID;
const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY;
const defaultInstallationId = process.env.GITHUB_APP_INSTALLATION_ID
  ? Number(process.env.GITHUB_APP_INSTALLATION_ID)
  : undefined;
const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET || "";

// Debug: Log if secret is loaded (only first time)
if (typeof window === "undefined") {
  console.log(`[GitHub App Service] Webhook secret loaded: ${!!webhookSecret}, length: ${webhookSecret.length}`);
}

const normalizedPrivateKey = privateKeyRaw?.includes("\\n")
  ? privateKeyRaw.replace(/\\n/g, "\n")
  : privateKeyRaw;

const githubApp =
  appId && normalizedPrivateKey
    ? new App({
        appId: Number(appId),
        privateKey: normalizedPrivateKey,
      })
    : null;

function ensureAppConfigured() {
  if (!githubApp) {
    throw new Error("GitHub App is not configured. Check app ID/private key env vars.");
  }
}

export const GitHubAppService = {
  async getInstallationAccessToken(installationId?: number): Promise<string> {
    ensureAppConfigured();
    const resolvedInstallationId = installationId ?? defaultInstallationId;
    if (!resolvedInstallationId) {
      throw new Error("Installation ID is required to request an access token.");
    }
    const octokit = await githubApp!.getInstallationOctokit(resolvedInstallationId);
    const authResult = (await octokit.auth({
      type: "installation",
    })) as { token: string } | { token?: undefined };
    if (!authResult.token) {
      throw new Error("Unable to retrieve installation token.");
    }
    return authResult.token;
  },

  async getOctokitForInstallation(installationId?: number): Promise<Octokit> {
    const token = await this.getInstallationAccessToken(installationId);
    return new Octokit({ auth: token });
  },

  verifyWebhookSignature(payload: string, signature?: string | null): boolean {
    // Check if secret is loaded at runtime (not just at module load)
    const runtimeSecret = process.env.GITHUB_APP_WEBHOOK_SECRET || webhookSecret;
    console.log(`[Webhook Signature] Starting verification.`, {
      moduleSecretExists: !!webhookSecret,
      moduleSecretLength: webhookSecret?.length || 0,
      runtimeSecretExists: !!runtimeSecret,
      runtimeSecretLength: runtimeSecret?.length || 0,
      secretsMatch: webhookSecret === runtimeSecret,
    });
    
    const secretToUse = runtimeSecret || webhookSecret;
    
    if (!secretToUse) {
      console.warn("GitHub webhook secret missing; skipping signature verification.");
      return true;
    }
    if (!signature) {
      console.warn("GitHub webhook signature header missing.");
      return false;
    }
    
    console.log(`[Webhook Signature] Received signature: ${signature.substring(0, 20)}... (length: ${signature.length})`);
    console.log(`[Webhook Signature] Full received signature: ${signature}`);
    
    const hmac = crypto.createHmac("sha256", secretToUse);
    const digest = `sha256=${hmac.update(payload).digest("hex")}`;
    
    console.log(`[Webhook Signature] Computed digest: ${digest.substring(0, 20)}... (length: ${digest.length})`);
    console.log(`[Webhook Signature] Full computed digest: ${digest}`);
    
    // Debug logging
    if (digest.length !== signature.length) {
      console.warn(`[Webhook Signature] Length mismatch: expected ${digest.length}, got ${signature.length}`);
      return false;
    }
    
    const signatureBytes = Uint8Array.from(Buffer.from(signature));
    const digestBytes = Uint8Array.from(Buffer.from(digest));
    
    if (signatureBytes.byteLength !== digestBytes.byteLength) {
      console.warn(`[Webhook Signature] Byte length mismatch: expected ${digestBytes.byteLength}, got ${signatureBytes.byteLength}`);
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(signatureBytes, digestBytes);
    if (!isValid) {
      console.warn(`[Webhook Signature] ❌ Signature mismatch!`, {
        secretLength: secretToUse.length,
        secretFirst10: secretToUse.substring(0, 10),
        payloadLength: payload.length,
        payloadFirst100: payload.substring(0, 100),
        receivedSig: signature,
        computedDigest: digest,
      });
    } else {
      console.log(`[Webhook Signature] ✅ Signature verified successfully!`);
    }
    return isValid;
  },
};

export default GitHubAppService;

