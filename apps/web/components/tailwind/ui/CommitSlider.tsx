import { format } from "date-fns";
import { MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Commit {
  sha: string;
  time: string; 
  message?: string;
  author?: { name: string; email: string };
  version: string;
}

interface CommitSliderProps {
  commits: Commit[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit, version: string) => void;
  onApply?: (commit: Commit) => void;
  isApplying?: boolean;
  className?: string;
  onClose?: () => void;
}

export const CommitSlider = ({
  commits,
  selectedCommit,
  onSelectCommit,
  onApply,
  isApplying = false,
  className,
  onClose,
}: CommitSliderProps) => {
  const sortedCommits = [...commits].slice(0, -1);
  
  return (
    <div
      className={cn(
        "border border-border rounded-lg shadow-sm w-[280px] flex flex-col bg-background dark:bg-background",
        "max-h-[calc(100vh-100px)]", // Full screen height minus 100px
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h3 className="text-m font-bold text-[#5F5E5B] dark:text-[#cac6c6]">Note History</h3>
        <div className="flex items-center gap-2">
          {selectedCommit && onApply && (
            <button
              onClick={() => onApply(selectedCommit)}
              disabled={isApplying}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
              title="Apply this version to the main editor"
            >
              {isApplying ? "Applying..." : "Apply"}
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Commits list - Scrollable container */}
      <div className="flex-1 overflow-y-auto relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="relative flex flex-col p-4">
          {/* Vertical timeline - positioned to extend through all content */}
          {sortedCommits.length > 0 && (
          <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gray-300 dark:bg-zinc-700 z-10" />
          )}

          {sortedCommits.map((commit, index) => {
            const isSelected = commit.sha === selectedCommit?.sha;
            return (
              <div
                key={commit.sha}
                className={cn(
                  "relative mb-4 cursor-pointer group hover:bg-accent rounded-lg p-2 -ml-2",
                )}
                onClick={() => onSelectCommit(commit, commit.version)}
              >
                {/* Dot */}
                <div
                  className={cn(
                    "absolute left-4 top-6 w-3 h-3 rounded-full border-2 z-20 transition-all",
                    isSelected
                      ? "bg-[#a19f9b] border-[#a19f9b] dark:bg-zinc-700 dark:border-zinc-700"
                      : "bg-background border-gray-300 dark:border-zinc-700"
                  )}
                  style={{ transform: "translate(-50%, -50%)" }}
                />
                
                {/* Commit details */}
                <div className="flex items-start justify-between ml-8">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#5F5E5B] dark:text-[#cac6c6]">
                      {format(new Date(commit.time), "MMMM d, yyyy")}
                    </div>
                    <div className="text-sm font-medium text-[#5F5E5B] dark:text-[#9B9B9B] mt-1">
                      {format(new Date(commit.time), "h:mm a")}
                    </div>
                    {isSelected && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-[#d1f5d1] text-[green]">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {sortedCommits.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No commits available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};