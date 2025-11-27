"use client";

import React from "react";
import { useEmbedModalContext } from "@/contexts/embedModalContext";
import { EmbedModal } from "./embed-modal";
import { getUrlFromString, isValidUrl } from "novel";
import { resolveEmbedUrl } from "@/lib/embed-providers";
import { toast } from "sonner";

export function EmbedModalWrapper() {
  const { isOpen, closeEmbedModal, editor, range, position } = useEmbedModalContext();

  const handleEmbed = React.useCallback(
    (url: string) => {
      if (!editor || !range) return;

      const normalizedUrl = getUrlFromString(url.trim());

      if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
        // Could show an error toast here
        console.error("Invalid URL");
        return;
      }

      const resolution = resolveEmbedUrl(normalizedUrl);

      if (resolution.status === "error") {
        toast.error(resolution.message);
        return;
      }

      // Handle GitHub preview links and blocked links - insert as bookmark
      if (resolution.status === "github-preview" || resolution.status === "blocked") {
        const url = resolution.status === "github-preview" ? resolution.url : normalizedUrl;
        
        // Insert bookmark node
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "bookmark",
            attrs: {
              url: url,
              title: null, // Will be fetched by the bookmark component
              description: null,
              image: null,
              favicon: null,
            },
          })
          .run();

        closeEmbedModal();
        return;
      }

      const nodeAttributes = {
        src: resolution.src,
        ...(resolution.options ?? {}),
      };

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setEmbed(nodeAttributes)
        .run();

      closeEmbedModal();
    },
    [editor, range, closeEmbedModal]
  );

  if (!isOpen) return null;

  return (
    <EmbedModal
      isOpen={isOpen}
      onClose={closeEmbedModal}
      onEmbed={handleEmbed}
      position={position || undefined}
    />
  );
}

