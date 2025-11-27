"use client";

import { Button } from "@/components/tailwind/ui/button";
import type { RecentlyVisitedNote } from "@/hooks/use-recentlyVisited";
import { FileText, RefreshCw } from "lucide-react";

interface RecentNotesWidgetProps {
  notes: RecentlyVisitedNote[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  formatTime: (timestamp: number) => string;
  onNoteClick: (noteId: string) => void;
}

export function RecentNotesWidget({
  notes,
  isLoading,
  error,
  onRefresh,
  formatTime,
  onNoteClick,
}: RecentNotesWidgetProps) {
  return (
    <div className="home-recent-panel">
      {isLoading ? (
        <div className="home-widget-empty">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
          <span>Loading recent notes…</span>
        </div>
      ) : error ? (
        <div className="home-widget-error">
          <p>{error}</p>
          <Button type="button" variant="outline" onClick={onRefresh}>
            Try again
          </Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="home-widget-empty">
          <FileText className="h-10 w-10 opacity-60" />
          <div>
            <strong>No recently visited pages</strong>
            <div className="text-xs opacity-75">Start browsing your notes to see them here.</div>
          </div>
        </div>
      ) : (
        <div className="notion-scroller horizontal hide-scrollbar">
          <div className="home-recent-row">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onNoteClick(note.id)}
                className="home-recent-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <div className="home-recent-card-cover-wrapper">
                  <div className="home-recent-card-cover" />
                  <div className="home-recent-card-icon">{note.icon || "📄"}</div>
                </div>
                <div className="home-recent-card-body">
                  <h3 className="home-recent-card-title line-clamp-2">{note.title}</h3>
                  <p className="home-recent-card-time">{formatTime(note.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {!isLoading && !error ? (
        <div className="home-recent-panel-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh recently visited notes"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
