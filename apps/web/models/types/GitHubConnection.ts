import { ObjectId } from "mongodb";

export interface InstallationSummary {
  id: number;
  accountId: number;
  accountLogin: string;
  repositorySelection: "all" | "selected";
  targetType?: string;
  suspendedAt?: Date;
}

export interface IGitHubConnection {
  _id?: ObjectId;
  userId: ObjectId;
  githubUserId: number;
  githubLogin: string;
  githubAvatarUrl?: string;
  accessToken: string; // encrypted
  refreshToken?: string; // encrypted
  tokenType: string;
  scopes: string[];
  expiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  installations: InstallationSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export default IGitHubConnection;

