"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmbed: (url: string) => void;
  position?: {
    top: number;
    left: number;
  };
  showUploadTab?: boolean;
  onUpload?: () => void;
}

export const EmbedModal: React.FC<EmbedModalProps> = ({
  isOpen,
  onClose,
  onEmbed,
  position,
  showUploadTab = false,
  onUpload,
}) => {
  const [activeTab, setActiveTab] = React.useState<"embed" | "upload">("embed");
  const [url, setUrl] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setActiveTab("embed");
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Delay to avoid immediate close on open
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onEmbed(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && url.trim()) {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: position ? "fixed" : "relative",
        pointerEvents: "auto",
        ...(position && {
          top: `${position.top - 10}px`, // Position slightly above cursor
          left: `${position.left}px`,
          transform: "translateY(-100%)", // Move up by its own height
        }),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          flexDirection: "column",
          transformOrigin: "50% bottom",
          insetInlineStart: 0,
          opacity: 1,
          transitionDuration: "200ms",
          transitionTimingFunction: "ease",
          transitionProperty: "opacity",
          bottom: 0,
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "rounded-[10px] bg-background dark:bg-[#1f1f1f]",
            "relative max-w-[calc(100vw-24px)]",
            "shadow-lg border border-border",
            "overflow-hidden",
            "z-50"
          )}
          style={{
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            className="notion-media-menu"
            style={{
              display: "flex",
              flexDirection: "column",
              width: "300px",
              minWidth: "180px",
              maxWidth: "calc(100vw - 24px)",
              height: "100%",
              maxHeight: "70vh",
            }}
          >
            {/* Tabs */}
            <div style={{ flexShrink: 0 }}>
              <div
                className="hide-scrollbar"
                role="tablist"
                style={{
                  overflow: "auto visible",
                  display: "flex",
                  width: "100%",
                  position: "relative",
                  boxShadow: "inset 0 -1px 0 var(--border)",
                  fontSize: "14px",
                  paddingInline: "8px",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    paddingTop: "6px",
                    paddingBottom: "6px",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    flexShrink: 0,
                    color: "var(--foreground)",
                    position: "relative",
                  }}
                >
                  <div
                    role="tab"
                    tabIndex={0}
                    aria-selected={activeTab === "embed"}
                    onClick={() => setActiveTab("embed")}
                    className={cn(
                      "user-select-none transition-colors cursor-pointer",
                      "inline-flex items-center h-7 px-2 rounded-md",
                      "text-sm flex-shrink-0 whitespace-nowrap",
                      "min-w-0",
                      activeTab === "embed"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                    style={{
                      transition: "background 20ms ease-in",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== "embed") {
                        e.currentTarget.style.backgroundColor = "var(--accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Embed link
                  </div>
                  {activeTab === "embed" && (
                    <div
                      style={{
                        borderBottom: "2px solid var(--foreground)",
                        position: "absolute",
                        bottom: 0,
                        insetInline: "8px",
                      }}
                    />
                  )}
                </div>
                {showUploadTab && (
                  <div
                    style={{
                      paddingTop: "6px",
                      paddingBottom: "6px",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      flexShrink: 0,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <div
                      role="tab"
                      tabIndex={0}
                      aria-selected={activeTab === "upload"}
                      onClick={() => {
                        setActiveTab("upload");
                        onUpload?.();
                      }}
                      className={cn(
                        "user-select-none transition-colors cursor-pointer",
                        "inline-flex items-center h-7 px-2 rounded-md",
                        "text-sm flex-shrink-0 whitespace-nowrap",
                        "min-w-0",
                        activeTab === "upload"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                      style={{
                        transition: "background 20ms ease-in",
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== "upload") {
                          e.currentTarget.style.backgroundColor = "var(--accent)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Upload
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div
              className="notion-scroller vertical"
              style={{
                zIndex: 1,
                flexGrow: 1,
                minHeight: 0,
                transform: "translateZ(0px)",
                overflow: "hidden auto",
              }}
            >
              {activeTab === "embed" && (
                <>
                  <div
                    style={{
                      gap: "1px",
                      position: "relative",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      marginTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        lineHeight: "120%",
                        width: "100%",
                        userSelect: "none",
                        minHeight: "28px",
                        fontSize: "14px",
                        paddingInline: "8px",
                        paddingTop: "4px",
                        paddingBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          marginInline: 0,
                          minWidth: 0,
                          flex: "1 1 auto",
                        }}
                      >
                        <div style={{ display: "flex" }}>
                          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                fontSize: "14px",
                                lineHeight: "20px",
                                position: "relative",
                                borderRadius: "6px",
                                boxShadow: "0 0 0 1px var(--border)",
                                background: "var(--background)",
                                cursor: "text",
                                paddingInline: "10px",
                                height: "28px",
                                padding: "3px 6px",
                              }}
                            >
                              <input
                                ref={inputRef}
                                type="url"
                                placeholder="Paste in https://…"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{
                                  fontSize: "inherit",
                                  lineHeight: "inherit",
                                  border: "none",
                                  background: "none",
                                  width: "100%",
                                  display: "block",
                                  resize: "none",
                                  padding: 0,
                                  outline: "none",
                                  color: "var(--foreground)",
                                }}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      gap: "1px",
                      position: "relative",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        lineHeight: "120%",
                        width: "100%",
                        userSelect: "none",
                        minHeight: "28px",
                        fontSize: "14px",
                        paddingInline: "8px",
                      }}
                    >
                      <div
                        style={{
                          marginInline: 0,
                          minWidth: 0,
                          flex: "1 1 auto",
                        }}
                      >
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <button
                            type="button"
                            role="button"
                            tabIndex={0}
                            onClick={handleSubmit}
                            disabled={!url.trim()}
                            className={cn(
                              "user-select-none transition-colors cursor-pointer",
                              "inline-flex items-center justify-center h-7 px-2 rounded-md",
                              "text-sm flex-shrink-0 whitespace-nowrap",
                              "font-medium w-full max-w-[300px] mx-auto",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              "bg-primary text-primary-foreground",
                              "hover:bg-primary/90"
                            )}
                            style={{
                              transition: "background 0.1s ease-in-out",
                            }}
                          >
                            Embed link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      lineHeight: "120%",
                      width: "100%",
                      userSelect: "none",
                      fontSize: "14px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      paddingInline: "8px",
                      background: "none",
                      borderBottom: "none",
                      marginTop: "2px",
                      marginBottom: "4px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        marginInline: 0,
                        minWidth: 0,
                        flex: "1 1 auto",
                      }}
                    >
                      <div
                        style={{
                          whiteSpace: "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "var(--muted-foreground)",
                          marginTop: "2px",
                          fontSize: "12px",
                        }}
                      >
                        Works with links of PDFs, Google Drive, Google Maps, CodePen…
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <footer style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );

  // If position is provided, render in portal; otherwise render inline
  if (position && typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

