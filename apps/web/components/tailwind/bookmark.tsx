"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkAttrs {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

// Bookmark component
const BookmarkView: React.FC<NodeViewProps> = ({ node, editor }) => {
  const attrs = (node as { attrs: BookmarkAttrs }).attrs;
  const [metadata, setMetadata] = useState<BookmarkAttrs>({
    url: attrs.url || "",
    title: attrs.title || "",
    description: attrs.description || "",
    image: attrs.image || "",
    favicon: attrs.favicon || "",
  });

  useEffect(() => {
    // If metadata is missing, fetch it
    if (attrs.url && (!attrs.title || !attrs.description)) {
      fetch(`/api/bookmark/metadata?url=${encodeURIComponent(attrs.url)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.title || data.description || data.image) {
            setMetadata({
              url: attrs.url,
              title: data.title || attrs.url,
              description: data.description || "",
              image: data.image || "",
              favicon: data.favicon || "",
            });
            // Update node attributes
            editor.commands.updateAttributes("bookmark", {
              title: data.title || attrs.url,
              description: data.description || "",
              image: data.image || "",
              favicon: data.favicon || "",
            });
          }
        })
        .catch(() => {
          // Fallback to URL if fetch fails
          setMetadata({
            url: attrs.url,
            title: attrs.url,
            description: "",
            image: "",
            favicon: "",
          });
        });
    } else {
      setMetadata({
        url: attrs.url,
        title: attrs.title || attrs.url,
        description: attrs.description || "",
        image: attrs.image || "",
        favicon: attrs.favicon || "",
      });
    }
  }, [attrs.url, attrs.title, attrs.description, attrs.image, attrs.favicon, editor]);

  const displayTitle = metadata.title || metadata.url;
  const displayDescription = metadata.description || metadata.url;
  const displayImage = metadata.image;
  const displayFavicon = metadata.favicon || `https://www.google.com/s2/favicons?domain=${new URL(metadata.url).hostname}&sz=16`;

  return (
    <NodeViewWrapper
      data-type="bookmark"
      className="notion-selectable notion-bookmark-block"
      style={{
        width: "100%",
        maxWidth: "931px",
        marginTop: "4px",
        marginBottom: "4px",
      }}
    >
      <div contentEditable={false} data-content-editable-void="true" role="figure">
        <div style={{ display: "flex" }}>
          <a
            href={metadata.url}
            role="link"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex flex-grow min-w-0 flex-wrap-reverse items-stretch text-start overflow-hidden",
              "border border-border rounded-[10px] relative",
              "text-inherit no-underline select-none cursor-pointer",
              "transition-colors duration-200 ease-in",
              "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            )}
          >
            {/* Content Section */}
            <div
              style={{
                flex: "4 1 180px",
                padding: "12px 14px 14px",
                overflow: "hidden",
                textAlign: "start",
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "var(--foreground)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minHeight: "24px",
                  marginBottom: "2px",
                  fontWeight: 500,
                }}
              >
                {displayTitle}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "var(--muted-foreground)",
                  height: "32px",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {displayDescription}
              </div>

              {/* URL with Favicon */}
              <div style={{ display: "flex", marginTop: "6px", alignItems: "center" }}>
                {displayFavicon && (
                  <img
                    src={displayFavicon}
                    alt=""
                    style={{
                      width: "16px",
                      height: "16px",
                      minWidth: "16px",
                      marginInlineEnd: "6px",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--foreground)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {metadata.url}
                </div>
              </div>
            </div>

            {/* Image Section */}
            {displayImage && (
              <div
                style={{
                  flex: "1 1 180px",
                  display: "block",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    insetInline: 0,
                    bottom: 0,
                  }}
                >
                  <div style={{ width: "100%", height: "100%" }}>
                    <img
                      alt=""
                      src={displayImage}
                      referrerPolicy="same-origin"
                      style={{
                        display: "block",
                        objectFit: "cover",
                        borderRadius: "2px",
                        width: "100%",
                        height: "100%",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </a>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// TipTap Extension
export const BookmarkExtension = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: null,
      },
      title: {
        default: null,
      },
      description: {
        default: null,
      },
      image: {
        default: null,
      },
      favicon: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "bookmark" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },
});

export default BookmarkExtension;

