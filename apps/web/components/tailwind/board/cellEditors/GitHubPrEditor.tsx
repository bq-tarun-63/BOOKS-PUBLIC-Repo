"use client";

import { useEffect, useRef, useState } from "react";
import { GitPullRequest } from "lucide-react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";
import { normalizeGitHubPrValue, getGitHubPrStatusMeta } from "@/utils/githubPr";

export default function GitHubPrEditor({
  value,
  property,
  onUpdate,
  onClose,
  note,
  boardId,
  position,
}: CellEditorProps) {
  const normalized = normalizeGitHubPrValue(value);
  const [owner, setOwner] = useState(normalized.owner ?? "");
  const [repo, setRepo] = useState(normalized.repo ?? "");
  const [pullNumber, setPullNumber] = useState(
    normalized.pullNumber ? String(normalized.pullNumber) : "",
  );
  const ownerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ownerRef.current?.focus();
  }, []);

  const handleSave = () => {
    onUpdate(note._id, property.id, {
      owner: owner || undefined,
      repo: repo || undefined,
      pullNumber: pullNumber || undefined,
    });
    onClose();
  };

  const statusMeta = getGitHubPrStatusMeta(normalized);
  const prLabel =
    normalized.title ||
    (normalized.pullNumber ?? normalized.number ? `#${normalized.pullNumber ?? normalized.number}` : "Not linked");

  return (
    <BaseCellEditor
      value={value}
      property={property}
      note={note}
      boardId={boardId}
      onUpdate={onUpdate}
      onClose={onClose}
      position={position}
    >
      <div className="p-3 space-y-3 w-[260px]">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitPullRequest className="w-4 h-4" />
          Link pull request
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            ref={ownerRef}
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="owner"
            className="px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="repo"
            className="px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <input
          type="number"
          value={pullNumber}
          onChange={(e) => setPullNumber(e.target.value)}
          placeholder="PR number"
          className="px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <button
          type="button"
          onClick={handleSave}
          className="w-full inline-flex justify-center items-center px-2.5 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Save
        </button>
        <div className="rounded-md border border-border/60 px-2 py-1.5 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">{prLabel}</div>
          <div className="mt-1 text-[11px]">
            Status: <span className="font-semibold">{statusMeta.label}</span>
          </div>
        </div>
      </div>
    </BaseCellEditor>
  );
}


