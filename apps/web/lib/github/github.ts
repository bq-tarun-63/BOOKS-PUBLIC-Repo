import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
dotenv.config();

export const owner = process.env.GITHUB_USERNAME || "";
export const repo = process.env.GITHUB_REPO || "";

// Initialize Octokit with GitHub token
export const octokit: Octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface GitHubApiError extends Error {
  status?: number;
}

export async function deleteFileFromGitHub({
  path,
  message,
  sha,
}: {
  path: string;
  message: string;
  sha: string;
}) {
  const res = await fetch(`https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      sha,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Failed to delete file from GitHub: ${error.message}`);
  }
}

export interface GitHubFileParams {
  path: string;
  content: string;
  message: string;
  branch?: string;
  sha?: string;
}

export async function getFileContent(path: string): Promise<{ content: string; sha: string }> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: owner as string,
      repo: repo as string,
      path,
    });

    // GitHub API returns different types for files, directories, and symlinks
    if (Array.isArray(response.data)) {
      throw new Error("Path is a directory, not a file");
    }

    // Type guard to check if this is a file response
    if (response.data.type !== "file" || !("content" in response.data)) {
      throw new Error("Path is not a regular file");
    }

    // Get the content and decode from base64
    const content = Buffer.from(response.data.content, "base64").toString("utf-8");
    const sha = response.data.sha;

    return { content, sha };
  } catch (error: unknown) {
    if ((error as GitHubApiError).status === 404) {
      return { content: "", sha: "" };
    }
    throw error;
  }
}

/**
 * Create or update a file in GitHub repository
 */
export async function createOrUpdateFile({
  path,
  content,
  message,
  branch = "main",
  sha,
}: GitHubFileParams): Promise<{ sha: string; url: string }> {
  try {
    const contentEncoded = Buffer.from(content).toString("base64");

    const params = {
      owner: owner as string,
      repo: repo as string,
      path,
      message,
      content: contentEncoded,
      branch,
      ...(sha ? { sha } : {}),
    };

    const response = await octokit.rest.repos.createOrUpdateFileContents(params);

    if (!response.data.content || !response.data.content.sha || !response.data.content.html_url) {
      throw new Error("Invalid response from GitHub API");
    }

    return {
      sha: response.data.content.sha,
      url: response.data.content.html_url,
    };
  } catch (error) {
    console.error("Error creating or updating file in GitHub:", error);
    throw error;
  }
}
