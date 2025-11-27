export const runtime = "nodejs";

import { Octokit } from "@octokit/core";
import { type NextRequest, NextResponse } from "next/server";
import { addOrUpdateImageStatus } from "../../../../lib/deleteNote/imageStatus/imageStatus";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return new Response(auth.error, { status: auth.status });
  }
  const { user } = auth;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  const referer = req.headers.get("referer") || "";
  const noteId = referer.split("/").pop(); // extracts the last part of the URL

  console.log("Note ID from referer:", noteId);

  if (!token) {
    return new Response("Missing GITHUB_TOKEN. Don't forget to add that to your .env file.", {
      status: 401,
    });
  }

  if (!username || !repo) {
    return new Response("Missing GITHUB_USERNAME or GITHUB_REPO. Don't forget to add them to your .env file.", {
      status: 401,
    });
  }

  if (!noteId) {
    return new Response("Unable to resolve note ID for upload", { status: 400 });
  }

  const file = await req.arrayBuffer();
  const contentBase64 = Buffer.from(file).toString("base64");
  const rawHeader = req.headers.get("x-vercel-filename") || "file";
  const originalFileName = decodeURIComponent(rawHeader).split("/").pop() || "upload.bin";
  const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
  const fileName = `docs/notes/${noteId}/uploads/${uniqueSuffix}-${originalFileName}`;
  // const contentType = req.headers.get("content-type") || "text/plain";
  // const fileType = `.${contentType.split("/")[1]}`;

  const octokit = new Octokit({
    auth: token,
  });

  const githuApiResponse = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: username,
    repo: repo,
    path: fileName,
    message: `Uploaded file: ${originalFileName}`,
    committer: {
      name: '${user.name}',
      email: '${user.email}',
    },
    content: contentBase64,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // construct final filename based on content-type if not provided
  // Properly encode the URL path segments to handle spaces and special characters
  const encodedPath = fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  
  const blob = {
    url: `https://raw.githubusercontent.com/${username}/${repo}/main/${encodedPath}`,
    status: githuApiResponse.status,
  };

  

  return NextResponse.json(blob);
}
