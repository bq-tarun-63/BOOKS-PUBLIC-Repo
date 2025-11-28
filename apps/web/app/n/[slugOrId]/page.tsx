"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EditorContent, EditorRoot, Placeholder, StarterKit, type JSONContent } from "novel";

interface PublicNote {
  id: string;
  title: string;
  content: string; // Content is now included in the API response
  contentPath: string;
  commitSha: string;
  icon: string;
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  publicSlug?: string;
  publicPublishedAt?: string;
  children?: Array<{
    _id: string;
    title: string;
    icon: string;
  }>;
}

export default function PublicNotePage() {
  const params = useParams();
  const slugOrId = params?.slugOrId as string;

  const [note, setNote] = useState<PublicNote | null>(null);
  const [content, setContent] = useState<JSONContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sanitize content to remove unsupported node types
   * This filters out custom extensions that aren't in StarterKit
   */
  const sanitizeContent = (content: JSONContent | null | undefined): JSONContent => {
    if (!content || typeof content !== "object") {
      return { type: "doc", content: [] };
    }

    // List of unsupported node types that StarterKit doesn't support
    const unsupportedTypes = [
      "reactComponentBlock",
      "databaseView",
      "databaseRow",
      "databaseColumn",
      "databaseCell",
      // Add other custom types that StarterKit doesn't support
    ];

    // If this node type is unsupported, return null (will be filtered out)
    if (content.type && unsupportedTypes.includes(content.type)) {
      return { type: "doc", content: [] };
    }

    // If it's a doc, sanitize its content
    if (content.type === "doc") {
      const sanitizedChildren = (content.content || [])
        .map((node) => sanitizeContent(node))
        .filter((node) => {
          // Filter out empty docs and unsupported types
          if (!node || !node.type) return false;
          if (node.type === "doc" && (!node.content || node.content.length === 0)) return false;
          return !unsupportedTypes.includes(node.type);
        });

      return {
        ...content,
        content: sanitizedChildren,
      };
    }

    // For other node types, recursively sanitize children
    if (content.content && Array.isArray(content.content)) {
      const sanitizedChildren = content.content
        .map((child) => sanitizeContent(child))
        .filter((node) => {
          if (!node || !node.type) return false;
          return !unsupportedTypes.includes(node.type);
        });

      return {
        ...content,
        content: sanitizedChildren,
      };
    }

    return content;
  };

  useEffect(() => {
    const fetchNote = async () => {
      try {
        // Fetch note with content (API now returns content directly)
        const noteResponse = await fetch(`/api/public/note/${slugOrId}`, {
          headers: {
            "include-content": "true",
          },
        });
        
        if (!noteResponse.ok) {
          throw new Error("Note not found or not published");
        }
        
        const noteData = await noteResponse.json();
        console.log("Note data received:", {
          title: noteData.title,
          hasContent: !!noteData.content,
          contentType: typeof noteData.content,
          contentLength: noteData.content?.length || 0,
          contentPreview: typeof noteData.content === "string" 
            ? noteData.content.substring(0, 200) 
            : JSON.stringify(noteData.content).substring(0, 200),
        });
        
        setNote(noteData);

        // Parse content if it's a string, otherwise use directly
        if (noteData.content) {
          try {
            // Content might be a JSON string or already parsed
            let parsedContent;
            if (typeof noteData.content === "string") {
              console.log("Step 1: Content is a string, parsing JSON...");
              // Try to parse as JSON
              if (noteData.content.trim().startsWith("{")) {
                parsedContent = JSON.parse(noteData.content);
                console.log("Step 2: JSON parsed successfully:", {
                  hasOnlineContent: !!parsedContent.online_content,
                  keys: Object.keys(parsedContent),
                });
              } else {
                // If it's not JSON, it might be empty or in a different format
                console.warn("Content is a string but doesn't look like JSON:", noteData.content.substring(0, 100));
                parsedContent = { type: "doc", content: [] };
              }
            } else {
              console.log("Step 1: Content is already an object");
              parsedContent = noteData.content;
            }
            
            // Check if content has online_content wrapper (like in the main app)
            if (parsedContent?.online_content) {
              console.log("Step 3: Found online_content wrapper, extracting...");
              parsedContent = parsedContent.online_content;
              console.log("Step 4: Extracted content:", {
                type: parsedContent?.type,
                hasContent: !!parsedContent?.content,
                contentLength: parsedContent?.content?.length || 0,
              });
            } else {
              console.log("Step 3: No online_content wrapper, using content directly:", {
                type: parsedContent?.type,
                hasContent: !!parsedContent?.content,
              });
            }
            
            // Validate that it's a proper ProseMirror document
            if (parsedContent?.type === "doc") {
              console.log("✅ Step 5: Content is valid doc, setting content:", {
                type: parsedContent.type,
                hasContent: !!parsedContent.content,
                contentLength: parsedContent.content?.length || 0,
                firstContentItem: parsedContent.content?.[0],
              });
              
              // Sanitize content to remove unsupported node types
              const sanitized = sanitizeContent(parsedContent);
              console.log("Step 6: Sanitized content:", {
                originalLength: parsedContent.content?.length || 0,
                sanitizedLength: sanitized.content?.length || 0,
              });
              
              setContent(sanitized);
            } else {
              console.warn("❌ Step 5: Content is not a valid doc structure:", {
                parsedContent,
                type: parsedContent?.type,
                keys: parsedContent ? Object.keys(parsedContent) : [],
              });
              setContent({ type: "doc", content: [] });
            }
          } catch (parseError) {
            console.error("❌ Error parsing note content:", parseError);
            console.error("Raw content:", noteData.content);
            // If parsing fails, try to use empty content
            setContent({ type: "doc", content: [] });
          }
        } else {
          console.warn("No content field in note data");
          // No content available
          setContent({ type: "doc", content: [] });
        }
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



  const publicExtensions = [
    StarterKit.configure({
      paragraph: {
        HTMLAttributes: { class: "public-note-paragraph" },
      },
    }),
    Placeholder.configure({
      placeholder: "This note has no content yet.",
    }),
  ];

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
          {content && (
            <EditorRoot>
              <EditorContent
                initialContent={content}
                extensions={publicExtensions}
                editable={false}
                immediatelyRender={false}
                editorProps={{
                  attributes: {
                    class: "prose dark:prose-invert focus:outline-none max-w-none",
                  },
                }}
              />
            </EditorRoot>
          )}
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

