"use client"

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { Code, Loader2, Upload, Image as ImageIcon, Type, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CmsCodeSidebar } from "./ui/cmsSidebar"; 

interface CmsBlockAttrs {
  contentId: string;
  projectId: string;
  slug?: string;
  content?: string;
  lastSavedContent?: string;
  locale?: string;
  type?: "text" | "image" ;
}

// Main CMS Block component
const CmsBlockView: React.FC<NodeViewProps> = ({ 
  node, 
  updateAttributes, 
  editor,
  deleteNode 
}) => {
  const attrs = (node as { attrs: CmsBlockAttrs }).attrs;
  const [content, setContent] = useState(attrs.content || "");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastPublishedContent, setLastPublishedContent] = useState(attrs.lastSavedContent || "");
  const [image, setImage] = useState("");
  const [isType, setIsType] = useState<"text" | "image">(attrs.type || "text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isTypeLocked = Boolean(attrs.type);
    
  useEffect(() => {
    if (attrs.type === "image" && attrs.content) {
      setImage(attrs.content); 
    }
  }, [attrs.type, attrs.content]);

  // Auto-save content to node attributes
  const saveContent = useCallback(
    debounce((newContent: string) => {
      updateAttributes({ content: newContent });
    }, 500),
    [updateAttributes]
  );

  useEffect(() => {
    const changed =
      isType === "text" ? content !== lastPublishedContent
      : isType === "image" ? (selectedFile !== null || content !== lastPublishedContent)
      : false;
    setHasChanges(changed);
  }, [content, selectedFile, lastPublishedContent, isType]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    saveContent(newContent);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToGitHub = async (file: File): Promise<string> => {
    const filePath = `docs/image/${file?.name || "image.png"}`;

    const response = await fetch('/api/note/upload', {
      method: 'POST',
      body: file,
      headers: {
        'x-vercel-filename': encodeURIComponent(filePath),
        "content-type": file?.type || "application/octet-stream",      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url;
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const payload: any = {
        projectId: attrs.projectId,
        type: isType,
        fields: {},
      };

      let bodyContent = content;

      if (isType === "image" && selectedFile) {
        try {
          const imageUrl = await uploadImageToGitHub(selectedFile);
          bodyContent = imageUrl;
        } catch (error) {
          console.error("Failed to upload image:", error);
          setIsPublishing(false);
          return;
        }
      }

      payload.fields.body = bodyContent;

      // Update the CMS content
      const updateRes = await fetch(`/api/cms/contents/${attrs.contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update content");
      }

      // Publish the content
      const publishRes = await fetch(`/api/cms/contents/${attrs.contentId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!publishRes.ok) {
        throw new Error("Failed to publish content");
      }

      setLastPublishedContent(bodyContent);
      setContent(bodyContent);
      setSelectedFile(null);
      updateAttributes({ 
        lastSavedContent: bodyContent,
        content: bodyContent,
        type: isType
      });
      toast.success("Content published successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("Failed to publish content");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <NodeViewWrapper className="cms-block-wrapper">
        <div className="bg-background dark:bg-background w-full ">
        <div className="relative bg-background dark:bg-background p-0 my-5 w-full max-w-[1200px]">
          {/* Header */}
          <div className="px-2">
            <h3 className="text-2xl font-semibold text-foreground m-0 mb-1">
              CMS Content Block
            </h3>
            <div className="flex items-center justify-between py-1 pt-3">
              <div className="flex items-center gap-3">
                {/* Toggle Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsType("text")}
                    disabled={isTypeLocked && attrs.type !== "text"}
                    className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors ${
                      isType === "text"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : isTypeLocked && attrs.type !== "text"
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-muted text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Type className="h-4 w-4"/>
                    Text
                  </button>

                  <button
                    onClick={() => setIsType("image")}
                    disabled={isTypeLocked && attrs.type !== "image"}
                    className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors ${
                      isType === "image"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : isTypeLocked && attrs.type !== "image"
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-muted text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4"/>
                    Image
                  </button>
              </div>

              {/* Unsaved Changes */}
              {hasChanges && (
                <div className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 !dark:text-gray-600">
                  Unsaved Changes
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Code size={15} />
                Code
              </button>

              <button
                onClick={handlePublish}
                disabled={isPublishing || !hasChanges}
                className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors ${
                  hasChanges
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <ExternalLink size={15} />
                    Publish
                  </>
                )}
              </button>
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="px-4 py-3">
            {isType === "text" && (
              <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Write your content here..."
              className="w-full p-3 min-h-[150px] bg-transparent border border-gray-200 dark:border-zinc-700 rounded-lg resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            />
            )}

            {isType === "image" && (
              <div className="relative border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg min-h-[200px] overflow-hidden">
                {!image && !attrs.content && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Upload size={48} className="text-gray-500" />
                      <span className="text-lg font-medium text-gray-500">Upload Image</span>
                    </div>
                  </div>
                )}
                  <div className="relative z-10 p-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-3 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 dark:file:bg-blue-900/30
                      file:text-blue-700 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 
                      file:cursor-pointer file:transition-colors"
                  />
                </div>

              {/* Image preview */}
              {(image || attrs.content) && (
                <div className="px-6 pb-6">
                  <div className="relative inline-block">
                    <img
                      src={image || attrs.content}
                      alt="CMS Image"
                      className="max-h-64 max-w-full rounded-md border border-gray-200 dark:border-zinc-700 shadow-sm"
                    />
                    {selectedFile && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        New
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </NodeViewWrapper>

      {/* Code Sidebar */}
      <CmsCodeSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        contentId={attrs.contentId}
        slug={attrs.slug}
        projectId={attrs.projectId}
      />
    </>
  );
};

// TipTap Extension
export const CmsBlockExtension = Node.create({
  name: "cmsBlock",
  group: "block",
  atom: true,
  draggable: true,
  
  addAttributes() {
    return {
      contentId: {
        default: null,
      },
      projectId: {
        default: null,
      },
      slug: {
        default: null,
      },
      content: {
        default: "",
      },
      lastSavedContent: {
        default: "",
      },
      locale: {
        default: "en-US",
      },
      type: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="cms-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "cms-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CmsBlockView);
  },
});

export default CmsBlockExtension;
