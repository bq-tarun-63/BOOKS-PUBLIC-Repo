"use client";

import React from "react";

interface DeleteConfirmationModalProps {
  header?: string; 
  title?: string;
  message?: string;
  extraMessage?: string; // Additional message content
  entity?: string; // e.g., "view", "note", "property"
  isOpen: boolean;
  isDeleting?: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: "red" | "blue" | "gray";
  count?: number;
  singleTitle?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  header,
  title,
  message,
  extraMessage,
  entity = "item",
  isOpen,
  onCancel,
  onConfirm,
  isDeleting = false,
  isProcessing = false,
  confirmButtonText,
  cancelButtonText = "Cancel",
  confirmButtonColor = "red",
  count,
  singleTitle,
}) => {
  if (!isOpen) return null;

  const processing = isDeleting || isProcessing;
  const formattedTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : title;
  const formattedSingleTitle = singleTitle
    ? singleTitle.charAt(0).toUpperCase() + singleTitle.slice(1)
    : singleTitle;

  const isGroup = count !== undefined && count > 1;
  const isSingle = count === 1;

  const getConfirmText = () => {
    if (processing && confirmButtonText) {
      // If processing and custom text provided, append "..." if not already present
      return confirmButtonText.endsWith("...") ? confirmButtonText : `${confirmButtonText}...`;
    }
    if (confirmButtonText) return confirmButtonText;
    if (processing) {
      if (confirmButtonColor === "red") return "Deleting...";
      return "Processing...";
    }
    if (confirmButtonColor === "red") return "Delete";
    return "Confirm";
  };

  const getMessage = () => {
    let mainMessage = message;
    
    if (!mainMessage) {
      if (isGroup) {
        mainMessage = `Are you sure you want to delete these ${entity} (${count} selected)?`;
      } else if (isSingle && singleTitle) {
        mainMessage = `Are you sure you want to delete this ${entity} titled ${formattedSingleTitle}?`;
      } else if (title) {
        mainMessage = `Are you sure you want to delete this ${entity} titled ${formattedTitle}?`;
      } else {
        mainMessage = `Are you sure you want to delete this ${entity}?`;
      }
    }
    
    if (extraMessage) {
      return (
        <>
          {mainMessage}
          <br />
          <br />
          <div className="border rounded-md border-red-300 bg-red-500/10 p-2">{extraMessage}</div>
        </>
      );
    }
    
    return mainMessage;
  };

  const getModalHeader = () => {
    if (header) return header;
    if (title) return `Delete ${title}`;
    if (confirmButtonColor === "red") return "Confirm Deletion";
    return "Confirm Action";
  };

  const getConfirmButtonClass = () => {
    const base = "px-4 py-2 text-sm rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed";
    switch (confirmButtonColor) {
      case "blue":
        return `${base} bg-blue-600 text-white hover:bg-blue-700`;
      case "gray":
        return `${base} bg-gray-600 text-white hover:bg-gray-700`;
      case "red":
      default:
        return `${base} bg-red-600 text-white hover:bg-red-700`;
    }
  };

  return (
    <div className="fixed inset-0 z-[12000] bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-[400px] max-w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white !m-0">
          {getModalHeader()}
        </h2>
        <div className=" mt-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
          {getMessage()}
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCancel}
            disabled={processing}
            type="button"
          >
            {cancelButtonText}
          </button>
          <button
            className={getConfirmButtonClass()}
            onClick={onConfirm}
            disabled={processing}
            type="button"
          >
            {getConfirmText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;


