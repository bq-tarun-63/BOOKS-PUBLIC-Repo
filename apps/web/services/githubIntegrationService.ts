import { Octokit } from "@octokit/rest";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongoDb/mongodb";
import type { IGitHubConnection, InstallationSummary } from "@/models/types/GitHubConnection";

export interface GitHubPullRequestStatus {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  draft: boolean;
  htmlUrl: string;
  headSha?: string;
  baseSha?: string;
  updatedAt?: string;
}

const COLLECTION = "githubConnections";
const githubClientId = process.env.GITHUB_CLIENT_ID || "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || "";

type OAuthResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

async function exchangeCodeForToken(code: string, redirectUri?: string): Promise<OAuthResponse> {
  if (!githubClientId || !githubClientSecret) {
    throw new Error("GitHub OAuth client is not configured.");
  }
  const params = new URLSearchParams({
    client_id: githubClientId,
    client_secret: githubClientSecret,
    code,
  });
  if (redirectUri) params.append("redirect_uri", redirectUri);

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: params,
  });
  const data = (await response.json()) as OAuthResponse & { error?: string; error_description?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to exchange code for token");
  }
  return data;
}

async function refreshToken(refreshToken: string): Promise<OAuthResponse> {
  if (!githubClientId || !githubClientSecret) {
    throw new Error("GitHub OAuth client is not configured.");
  }
  const params = new URLSearchParams({
    client_id: githubClientId,
    client_secret: githubClientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: params,
  });
  const data = (await response.json()) as OAuthResponse & { error?: string; error_description?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to refresh GitHub token");
  }
  return data;
}

async function getCollection() {
  const client = await clientPromise();
  const db = client.db();
  return db.collection<IGitHubConnection>(COLLECTION);
}

async function fetchInstallations(octokit: Octokit): Promise<InstallationSummary[]> {
  try {
    const { data } = await octokit.apps.listInstallationsForAuthenticatedUser();
    return data.installations.map((installation) => ({
      id: installation.id,
      accountId: installation.account?.id ?? 0,
      accountLogin: (() => {
        const account = installation.account;
        if (account && "login" in account && typeof account.login === "string") {
          return account.login;
        }
        if (account && "name" in account && typeof account.name === "string") {
          return account.name ?? "";
        }
        return "";
      })(),
      repositorySelection: installation.repository_selection,
      targetType: installation.target_type,
      suspendedAt: installation.suspended_at ? new Date(installation.suspended_at) : undefined,
    }));
  } catch (error) {
    console.warn("Unable to fetch installations for user:", error);
    return [];
  }
}

export const GitHubIntegrationService = {
  async startOAuth(code: string, redirectUri?: string) {
    return exchangeCodeForToken(code, redirectUri);
  },

  async refreshUserToken(connection: IGitHubConnection) {
    if (!connection.refreshToken) {
      throw new Error("Connection does not have a refresh token.");
    }
    const refreshed = await refreshToken(connection.refreshToken);
    const now = new Date();
    const expiresAt = refreshed.expires_in
      ? new Date(now.getTime() + refreshed.expires_in * 1000)
      : undefined;
    const refreshExpiresAt = refreshed.refresh_token_expires_in
      ? new Date(now.getTime() + refreshed.refresh_token_expires_in * 1000)
      : undefined;

    const collection = await getCollection();
    await collection.updateOne(
      { _id: connection._id },
      {
        $set: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? connection.refreshToken,
          tokenType: refreshed.token_type,
          scopes: refreshed.scope ? refreshed.scope.split(",") : connection.scopes,
          expiresAt,
          refreshTokenExpiresAt: refreshExpiresAt,
          updatedAt: now,
        },
      }
    );

    return {
      ...connection,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? connection.refreshToken,
      tokenType: refreshed.token_type,
      scopes: refreshed.scope ? refreshed.scope.split(",") : connection.scopes,
      expiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      updatedAt: now,
    };
  },

  async upsertConnection({
    userId,
    tokenResponse,
    redirectUri,
  }: {
    userId: string;
    tokenResponse: OAuthResponse;
    redirectUri?: string;
  }) {
    const octokit = new Octokit({
      auth: tokenResponse.access_token,
    });
    const { data: user } = await octokit.users.getAuthenticated();
    if (!("login" in user)) {
      throw new Error("GitHub OAuth response did not include a user identity.");
    }
    const installations = await fetchInstallations(octokit);

    const now = new Date();
    const expiresAt = tokenResponse.expires_in
      ? new Date(now.getTime() + tokenResponse.expires_in * 1000)
      : undefined;
    const refreshExpiresAt = tokenResponse.refresh_token_expires_in
      ? new Date(now.getTime() + tokenResponse.refresh_token_expires_in * 1000)
      : undefined;

    const collection = await getCollection();

    const updateDoc: Partial<IGitHubConnection> & { updatedAt: Date } = {
      githubUserId: user.id,
      githubLogin: user.login,
      githubAvatarUrl: user.avatar_url,
      accessToken: tokenResponse.access_token,
      tokenType: tokenResponse.token_type,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(",") : [],
      expiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      installations,
      updatedAt: now,
    };
    if (tokenResponse.refresh_token) {
      updateDoc.refreshToken = tokenResponse.refresh_token;
    }

    await collection.updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: updateDoc,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return { redirectUri, installations };
  },

  async getConnectionByUserId(userId: string) {
    const collection = await getCollection();
    return collection.findOne({ userId: new ObjectId(userId) });
  },

  async deleteConnection(userId: string) {
    const collection = await getCollection();
    await collection.deleteOne({ userId: new ObjectId(userId) });
  },

  async getOctokitForUser(userId: string): Promise<Octokit | null> {
    const connection = await this.getConnectionByUserId(userId);
    if (!connection) return null;
    let activeConnection = connection;
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      activeConnection = await this.refreshUserToken(connection);
    }
    return new Octokit({
      auth: activeConnection.accessToken,
    });
  },

  async updateInstallations(installation: InstallationSummary) {
    const collection = await getCollection();
    await collection.updateMany(
      { "installations.id": installation.id },
      {
        $set: {
          "installations.$.repositorySelection": installation.repositorySelection,
          "installations.$.targetType": installation.targetType,
          "installations.$.suspendedAt": installation.suspendedAt,
          updatedAt: new Date(),
        },
      }
    );
  },

  async removeInstallation(installationId: number) {
    const collection = await getCollection();
    await collection.updateMany(
      {},
      {
        $pull: { installations: { id: installationId } },
        $set: { updatedAt: new Date() },
      }
    );
  },

  async getPullRequestStatus({
    userId,
    owner,
    repo,
    pullNumber,
    installationId,
  }: {
    userId: string;
    owner: string;
    repo: string;
    pullNumber: number;
    installationId?: number;
  }): Promise<GitHubPullRequestStatus> {
    let octokit = await this.getOctokitForUser(userId);
    
    // Try user token first, fallback to installation if needed
    if (!octokit && installationId) {
      const { GitHubAppService } = await import("./githubAppService");
      try {
        octokit = await GitHubAppService.getOctokitForInstallation(installationId);
      } catch (error) {
        console.warn("Failed to get installation Octokit:", error);
      }
    }
    
    if (!octokit) {
      throw new Error("GitHub connection not found for user");
    }
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      merged: Boolean(data.merged_at),
      draft: Boolean(data.draft),
      htmlUrl: data.html_url,
      headSha: data.head?.sha,
      baseSha: data.base?.sha,
      updatedAt: data.updated_at,
    };
  },

  async listPullRequests({
    userId,
    owner,
    repo,
    installationId,
    state = "open",
    perPage = 30,
  }: {
    userId: string;
    owner: string;
    repo: string;
    installationId?: number;
    state?: "open" | "closed" | "all";
    perPage?: number;
  }): Promise<GitHubPullRequestStatus[]> {
    let octokit = await this.getOctokitForUser(userId);
    
    // Try user token first, fallback to installation if needed
    if (!octokit && installationId) {
      const { GitHubAppService } = await import("./githubAppService");
      try {
        octokit = await GitHubAppService.getOctokitForInstallation(installationId);
      } catch (error) {
        console.warn("Failed to get installation Octokit:", error);
      }
    }
    
    if (!octokit) {
      throw new Error("GitHub connection not found for user");
    }
    
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: perPage,
      sort: "updated",
      direction: "desc",
    });

    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state as "open" | "closed",
      merged: Boolean(pr.merged_at),
      draft: Boolean(pr.draft),
      htmlUrl: pr.html_url,
      headSha: pr.head?.sha,
      baseSha: pr.base?.sha,
      updatedAt: pr.updated_at,
    }));
  },
};

export default GitHubIntegrationService;

