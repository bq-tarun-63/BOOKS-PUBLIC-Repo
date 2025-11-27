"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EditorContent, EditorRoot, type JSONContent } from "novel";
import { defaultExtensions } from "@/components/tailwind/extensions";

interface PublicNote {
  id: string;
  title: string;
  contentPath: string;
  commitSha: string;
  icon: string;
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  publicSlug?: string;
  publicPublishedAt?: string;
}

export default function PublicNotePage() {
  const params = useParams();
  const slugOrId = params?.slugOrId as string;

  const [note, setNote] = useState<PublicNote | null>(null);
  const [content, setContent] = useState<JSONContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        // Fetch note metadata
        const noteResponse = await fetch(`/api/public/note/${slugOrId}`);
        if (!noteResponse.ok) {
          throw new Error("Note not found or not published");
        }
        const noteData = await noteResponse.json();
        setNote(noteData);

        // Fetch note content from GitHub
        const contentResponse = await fetch(
          `https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || ""}/${noteData.commitSha}/${noteData.contentPath}`
        );
        if (!contentResponse.ok) {
          throw new Error("Failed to fetch note content");
        }
        const contentText = await contentResponse.text();
        const contentJson = JSON.parse(contentText);
        setContent(contentJson);
      } catch (err) {
        console.error("Error loading public note:", err);
        setError(err instanceof Error ? err.message : "Failed to load note");
      } finally {
        setLoading(false);
      }
    };

    if (slugOrId) {
      fetchNote();
    }
  }, [slugOrId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note || !content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Note not found or no longer published
          </p>
          {error && (
            <p className="text-sm text-gray-500 dark:text-gray-500">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Simple header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>📄</span>
            <span>Published Note</span>
          </div>
        </div>
      </header>

      {/* Note content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Cover image */}
        {note.coverUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={note.coverUrl}
              alt="Cover"
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Title with icon */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {note.icon && (
              <span className="text-6xl" role="img" aria-label="Note icon">
                {note.icon}
              </span>
            )}
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
            {note.title}
          </h1>
        </div>

        {/* Editor content (read-only) */}
        <div className="prose dark:prose-invert max-w-none">
          <EditorRoot>
            <EditorContent
              initialContent={content}
              extensions={defaultExtensions}
              editable={false}
              editorProps={{
                attributes: {
                  class: "prose dark:prose-invert focus:outline-none max-w-none",
                },
              }}
            />
          </EditorRoot>
        </div>

        {/* Footer info */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Published on {new Date(note.publicPublishedAt || note.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-2 text-xs">
            This is a read-only view. Changes to the original note will be reflected here.
          </p>
        </footer>
      </main>
    </div>
  );
}

