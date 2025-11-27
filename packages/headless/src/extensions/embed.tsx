import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FC } from "react";
import { isValidUrl } from "../utils";

const DEFAULT_EMBED_HEIGHT = 320;
const DEFAULT_EMBED_WIDTH = 480;
const DEFAULT_MIN_WIDTH = 240;
const DEFAULT_MIN_HEIGHT = 160;
const DEFAULT_MAX_WIDTH = 1024;

const IFRAME_SANDBOX =
  "allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-same-origin allow-storage-access-by-user-activation allow-popups-to-escape-sandbox";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type EmbedAttributes = {
  src?: string;
  height?: number | string;
  width?: number | string;
};

type ResizeDirection = "left" | "right" | "bottom" | "corner";

const getCursorForDirection = (direction: ResizeDirection) => {
  if (direction === "bottom") return "ns-resize";
  if (direction === "corner") return "nwse-resize";
  return "ew-resize";
};

const EmbedComponent: FC<NodeViewProps> = ({ node, selected, updateAttributes, extension, getPos, editor }) => {
  const attrs = ((node as { attrs?: EmbedAttributes })?.attrs ?? {}) as EmbedAttributes;
  const { src } = attrs;

  const {
    defaultHeight,
    defaultWidth,
    minWidth,
    minHeight,
    maxWidth,
    HTMLAttributes: baseHtmlAttributes = {},
  } = extension.options;

  const parsedHeight = Number(attrs.height);
  const parsedWidth = Number(attrs.width);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const activeListenersRef = useRef<{
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
    blur?: () => void;
  } | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [dimensions, setDimensions] = useState(() => ({
    width: Number.isFinite(parsedWidth) ? parsedWidth : defaultWidth,
    height: Number.isFinite(parsedHeight) ? parsedHeight : defaultHeight,
  }));
  const dimensionsRef = useRef(dimensions);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  const ensureSelected = useCallback(() => {
    if (!editor?.isEditable) return;
    if (selected) return;
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos === "number") {
        editor.chain().setNodeSelection(pos).focus().run();
      }
    } catch (_error) {
      // Swallow positional errors, the node may not be mounted yet.
    }
  }, [editor, getPos, selected]);

  useEffect(() => {
    if (resizingRef.current) return;
    const newDims = {
      width: Number.isFinite(parsedWidth) ? parsedWidth : defaultWidth,
      height: Number.isFinite(parsedHeight) ? parsedHeight : defaultHeight,
    };
    setDimensions(newDims);
    dimensionsRef.current = newDims;
  }, [defaultHeight, defaultWidth, parsedHeight, parsedWidth]);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  const clampWidth = useCallback(
    (value: number) => clamp(value, minWidth, maxWidth),
    [minWidth, maxWidth],
  );

  const clampHeight = useCallback(
    (value: number) => Math.max(value, minHeight),
    [minHeight],
  );

  const startResize = useCallback(
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const container = containerRef.current;
      if (!container) return;
      const viewport = viewportRef.current ?? container;

      ensureSelected();

      const directionCursor = getCursorForDirection(direction);
      document.body.style.cursor = directionCursor;
      resizingRef.current = true;

      const widthRect = container.getBoundingClientRect();
      const heightRect = viewport.getBoundingClientRect();
      const startWidth = widthRect.width;
      const startHeight = heightRect.height;
      const startX = event.clientX;
      const startY = event.clientY;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        // Safety check: only process if we're still in resize mode
        if (!resizingRef.current) {
          return;
        }

        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        // Cancel any pending animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          if (!resizingRef.current) {
            return;
          }

          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          let nextWidth = startWidth;
          let nextHeight = startHeight;

          if (direction === "right" || direction === "corner") {
            nextWidth = clampWidth(startWidth + deltaX);
          }
          if (direction === "left") {
            nextWidth = clampWidth(startWidth - deltaX);
          }
          if (direction === "bottom" || direction === "corner") {
            nextHeight = clampHeight(startHeight + deltaY);
          }

          // Only update if values actually changed to prevent unnecessary re-renders
          setDimensions((prev) => {
            const newWidth = direction === "left" || direction === "right" || direction === "corner" ? nextWidth : prev.width;
            const newHeight = direction === "bottom" || direction === "corner" ? nextHeight : prev.height;
            
            // Only update if changed to prevent jumpiness
            if (Math.abs(newWidth - prev.width) < 0.5 && Math.abs(newHeight - prev.height) < 0.5) {
              return prev;
            }
            
            const newDims = {
              width: newWidth,
              height: newHeight,
            };
            // Update ref immediately for synchronous access
            dimensionsRef.current = newDims;
            return newDims;
          });
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        // Safety check: only process if we're still in resize mode
        if (!resizingRef.current) {
          return;
        }

        upEvent.preventDefault();
        upEvent.stopPropagation();
        
        // Cancel any pending animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Immediately stop resizing to prevent further updates
        resizingRef.current = false;
        
        // Release pointer capture if it was set
        if (event.currentTarget instanceof HTMLElement) {
          try {
            event.currentTarget.releasePointerCapture(upEvent.pointerId);
          } catch (e) {
            // Ignore errors if pointer capture wasn't set
          }
        }
        
        // Remove all event listeners immediately
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
        document.removeEventListener("lostpointercapture", handleLostPointerCapture);
        window.removeEventListener("blur", handleWindowBlur);

        // Get final dimensions from ref (always up-to-date)
        const currentDimensions = dimensionsRef.current;
        const finalWidth = clampWidth(currentDimensions.width);
        const finalHeight = clampHeight(currentDimensions.height);

        // Update to final clamped values
        setDimensions({
          width: finalWidth,
          height: finalHeight,
        });

        // Save to attributes
        updateAttributes({
          width: Math.round(finalWidth),
          height: Math.round(finalHeight),
        });

        activeListenersRef.current = null;
        document.body.style.cursor = "";
      };

      // Handle lost pointer capture - stops resize when pointer is lost
      const handleLostPointerCapture = (captureEvent: PointerEvent) => {
        if (resizingRef.current) {
          // Cancel any pending animation frame
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          resizingRef.current = false;
          document.removeEventListener("pointermove", handlePointerMove);
          document.removeEventListener("pointerup", handlePointerUp);
          document.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("lostpointercapture", handleLostPointerCapture);
          window.removeEventListener("blur", handleWindowBlur);
          document.body.style.cursor = "";
          activeListenersRef.current = null;
        }
      };

      // Handle window blur/visibility change as a safety measure to stop resizing
      const handleWindowBlur = () => {
        if (resizingRef.current) {
          // Cancel any pending animation frame
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          resizingRef.current = false;
          document.removeEventListener("pointermove", handlePointerMove);
          document.removeEventListener("pointerup", handlePointerUp);
          document.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("lostpointercapture", handleLostPointerCapture);
          window.removeEventListener("blur", handleWindowBlur);
          document.body.style.cursor = "";
          activeListenersRef.current = null;
        }
      };

      // Use pointer capture for better control, especially when dragging inward
      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerUp);
      document.addEventListener("lostpointercapture", handleLostPointerCapture);
      window.addEventListener("blur", handleWindowBlur);
      activeListenersRef.current = { move: handlePointerMove, up: handlePointerUp, blur: handleWindowBlur };
    },
    [clampHeight, clampWidth, ensureSelected, updateAttributes],
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount: stop any active resize operations
      if (resizingRef.current) {
        resizingRef.current = false;
      }
      
      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      document.body.style.cursor = "";
      const listeners = activeListenersRef.current;
      if (listeners?.move) {
        document.removeEventListener("pointermove", listeners.move);
      }
      if (listeners?.up) {
        document.removeEventListener("pointerup", listeners.up);
        document.removeEventListener("pointercancel", listeners.up);
        // Note: lostpointercapture handler is defined inside startResize, so we can't remove it here
        // But it will be cleaned up when the resize operation ends
      }
      if (listeners?.blur) {
        window.removeEventListener("blur", listeners.blur);
      }
      activeListenersRef.current = null;
    };
  }, []);

  if (!src) return null;

  const htmlAttributes = { ...baseHtmlAttributes };
  const htmlClass = (htmlAttributes as { class?: string }).class;
  if ("class" in htmlAttributes) {
    delete (htmlAttributes as { class?: string }).class;
  }

  const htmlStyle = (htmlAttributes as { style?: CSSProperties }).style;
  if ("style" in htmlAttributes) {
    delete (htmlAttributes as { style?: CSSProperties }).style;
  }

  const wrapperStyle: CSSProperties = {
    width: `${dimensions.width}px`,
    maxWidth: "100%",
    margin: "12px auto",
    borderRadius: "8px",
    border: selected ? "1.5px solid rgba(37, 99, 235, 0.4)" : "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: selected ? "0 0 0 1.5px rgba(37, 99, 235, 0.2)" : "none",
    background: "var(--c-bacEle, transparent)",
    transition: "border 120ms ease, box-shadow 120ms ease",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    visibility: isLoaded ? "visible" : "hidden",
    opacity: isLoaded ? 1 : 0,
    pointerEvents: isLoaded ? "auto" : "none",
    ...(htmlStyle ?? {}),
  };

  const showHandles = isLoaded && editor?.isEditable !== false && (selected || isHovered);

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={["novel-embed-block", htmlClass].filter(Boolean).join(" ")}
      data-embed-block=""
      data-embed-src={src}
      style={wrapperStyle}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      {...htmlAttributes}
    >
      <div
        ref={viewportRef}
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          width: "100%",
          minHeight: `${minHeight}px`,
          height: `${Math.max(dimensions.height, minHeight)}px`,
          background: "transparent",
        }}
      >
        <iframe
          src={src}
          frameBorder="0"
          allowFullScreen
          sandbox={IFRAME_SANDBOX}
          onLoad={() => setIsLoaded(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            borderRadius: "0 0 10px 10px",
            pointerEvents: "auto",
            backgroundColor: "var(--c-bacPri)",
          }}
        />

        {showHandles ? (
          <>
            <div
              role="presentation"
              onPointerDown={startResize("left")}
              style={{
                position: "absolute",
                insetBlock: "0",
                insetInlineStart: "-6px",
                width: "12px",
                cursor: "ew-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  height: "48px",
                  width: "6px",
                  borderRadius: "12px",
                  background: "rgba(148, 163, 184, 0.6)",
                }}
              />
            </div>
            <div
              role="presentation"
              onPointerDown={startResize("right")}
              style={{
                position: "absolute",
                insetBlock: "0",
                insetInlineEnd: "-6px",
                width: "12px",
                cursor: "ew-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  height: "48px",
                  width: "6px",
                  borderRadius: "12px",
                  background: "rgba(148, 163, 184, 0.6)",
                }}
              />
            </div>
            <div
              role="presentation"
              onPointerDown={startResize("bottom")}
              style={{
                position: "absolute",
                insetInline: "0",
                insetBlockEnd: "-6px",
                height: "12px",
                cursor: "ns-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "6px",
                  borderRadius: "12px",
                  background: "rgba(148, 163, 184, 0.6)",
                }}
              />
            </div>
            <div
              role="presentation"
              onPointerDown={startResize("corner")}
              style={{
                position: "absolute",
                insetBlockEnd: "-10px",
                insetInlineEnd: "-10px",
                width: "20px",
                height: "20px",
                cursor: "nwse-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  border: "1px solid rgba(148, 163, 184, 0.6)",
                  background: "rgba(226, 232, 240, 0.75)",
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
};

export interface EmbedOptions {
  HTMLAttributes: Record<string, unknown>;
  inline: boolean;
  defaultHeight: number;
  defaultWidth: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
}

type SetEmbedOptions = {
  src: string;
  height?: number;
  width?: number;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert a generic embed iframe.
       */
      setEmbed: (options: SetEmbedOptions) => ReturnType;
    };
  }
}

export const Embed = Node.create<EmbedOptions>({
  name: "embed",

  addOptions() {
    return {
      HTMLAttributes: {},
      inline: false,
      defaultHeight: DEFAULT_EMBED_HEIGHT,
      defaultWidth: DEFAULT_EMBED_WIDTH,
      minWidth: DEFAULT_MIN_WIDTH,
      minHeight: DEFAULT_MIN_HEIGHT,
      maxWidth: DEFAULT_MAX_WIDTH,
    };
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  inline() {
    return this.options.inline;
  },

  atom: true,

  isolating: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: this.options.defaultWidth,
        parseHTML: (element) => {
          const widthAttr = element.getAttribute("data-embed-width");
          const parsed = Number(widthAttr);
          return Number.isFinite(parsed) ? parsed : this.options.defaultWidth;
        },
        renderHTML: (attributes) => {
          const { width } = attributes;
          const parsed = Number(width);
          return {
            "data-embed-width": Number.isFinite(parsed) ? String(parsed) : String(this.options.defaultWidth),
          };
        },
      },
      height: {
        default: this.options.defaultHeight,
        parseHTML: (element) => {
          const heightAttr = element.getAttribute("data-embed-height");
          const parsed = Number(heightAttr);
          return Number.isFinite(parsed) ? parsed : this.options.defaultHeight;
        },
        renderHTML: (attributes) => {
          const { height } = attributes;
          const parsed = Number(height);
          return {
            "data-embed-height": Number.isFinite(parsed) ? String(parsed) : String(this.options.defaultHeight),
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedComponent);
  },

  parseHTML() {
    return [
      {
        tag: "div[data-embed-block]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(
      { "data-embed-block": "" },
      this.options.HTMLAttributes,
      HTMLAttributes,
    );
    const src = HTMLAttributes.src as string | undefined;
    const heightAttr = HTMLAttributes.height ?? HTMLAttributes["data-embed-height"];
    const widthAttr = HTMLAttributes.width ?? HTMLAttributes["data-embed-width"];
    const parsedHeight = Number(heightAttr);
    const parsedWidth = Number(widthAttr);
    const height = Number.isFinite(parsedHeight) ? parsedHeight : this.options.defaultHeight;
    const width = Number.isFinite(parsedWidth) ? parsedWidth : this.options.defaultWidth;

    return [
      "div",
      mergeAttributes(attrs, {
        "data-embed-src": src ?? "",
        "data-embed-width": String(width),
        "data-embed-height": String(height),
        style: `width:${width}px;max-width:100%;margin:12px auto;border-radius:8px;border:1px solid rgba(148,163,184,0.2);overflow:hidden;`,
      }),
      [
        "div",
        { "data-embed-viewport": "", style: `position:relative;width:100%;height:${height}px;overflow:hidden;background:transparent;` },
        [
          "iframe",
          {
            src,
            frameborder: "0",
            allowfullscreen: "true",
            sandbox: IFRAME_SANDBOX,
            style: "position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;",
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        ({ src, height, width }) =>
        ({ commands }) => {
          if (!isValidUrl(src)) {
            return false;
          }

          const parsedHeight = Number(height);
          const embedHeight = Number.isFinite(parsedHeight) ? parsedHeight : this.options.defaultHeight;
          const parsedWidth = Number(width);
          const embedWidth = Number.isFinite(parsedWidth) ? parsedWidth : this.options.defaultWidth;

          return commands.insertContent({
            type: this.name,
            attrs: {
              src,
              height: embedHeight,
              width: embedWidth,
            },
          });
        },
    };
  },
});

