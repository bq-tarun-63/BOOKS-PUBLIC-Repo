"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { EmbedModal } from "@/components/tailwind/ui/embed-modal";
import { getUrlFromString, isValidUrl } from "novel";

export interface UseEmbedModalOptions {
  onEmbed: (url: string) => void;
  showUploadTab?: boolean;
  onUpload?: () => void;
}

export interface EmbedModalState {
  isOpen: boolean;
  position?: { top: number; left: number };
}

export function useEmbedModal({ onEmbed, showUploadTab, onUpload }: UseEmbedModalOptions) {
  const [modalState, setModalState] = useState<EmbedModalState>({
    isOpen: false,
  });

  const openModal = useCallback(
    (position?: { top: number; left: number }) => {
      setModalState({
        isOpen: true,
        position,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
    });
  }, []);

  const handleEmbed = useCallback(
    (url: string) => {
      const normalizedUrl = getUrlFromString(url.trim());

      if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
        // You could show an error message here
        console.error("Invalid URL");
        return;
      }

      onEmbed(normalizedUrl);
      closeModal();
    },
    [onEmbed, closeModal]
  );

  const ModalComponent = useCallback(
    () => (
      <EmbedModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onEmbed={handleEmbed}
        position={modalState.position}
        showUploadTab={showUploadTab}
        onUpload={onUpload}
      />
    ),
    [modalState, closeModal, handleEmbed, showUploadTab, onUpload]
  );

  return {
    openModal,
    closeModal,
    isOpen: modalState.isOpen,
    ModalComponent,
  };
}

