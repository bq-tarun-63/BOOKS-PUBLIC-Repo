import { octokit, owner, repo } from "@/lib/github/github";

// Helper to list all files in a directory in the repo
async function listFilesInDir(dir: string): Promise<string[]> {
  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: dir,
    });
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item.type === "file").map((item) => item.path);
    }
    return [];
  } catch (e: any) {
    // If directory doesn't exist, ignore
    if (e.status === 404) return [];
    throw e;
  }
}

export async function deleteGitHubFiles(paths: string[], commitMessage: string) {
  // Separate files and directories
  const files: string[] = [];
  for (const path of paths) {
    if (path.endsWith("/")) {
      // List all files in this directory
      const dirFiles = await listFilesInDir(path.slice(0, -1));
      files.push(...dirFiles);
    } else {
      files.push(path);
    }
  }

  // Get the latest commit SHA on main
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const latestCommitSha = refData.object.sha;

  // Get the tree SHA
  const { data: commitData } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  // Prepare deletions (only files)
  const tree = files.map((path) => ({
    path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: null,
  }));

  // Create a new tree
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  });

  // Create a new commit
  const {data: newCommit} = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // Update the reference
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: newCommit.sha,
  });

  return newCommit.sha;
}
