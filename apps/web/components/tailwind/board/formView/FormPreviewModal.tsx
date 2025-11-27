"use client";

import { useBoard } from "@/contexts/boardContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useAuth } from "@/hooks/use-auth";
import useAddRootPage from "@/hooks/use-addRootPage";
import type { ViewCollection, BoardProperty, Note } from "@/types/board";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, X, Link, Edit2Icon } from "lucide-react";
import { FORM_PROPERTY_TYPES } from "./FormAddPropertyDialog";
import FormQuestionCard from "./FormQuestionCard";
import EditIcon from "@/components/tailwind/ui/icons/editIcon";
import Image from "next/image";

interface FormPreviewModalProps {
  readonly board: ViewCollection;
  readonly onClose: () => void;
}

export default function FormPreviewModal({ board, onClose }: FormPreviewModalProps) {
  const { addRootPage } = useAddRootPage();
  const {
    currentView,
    boards: contextBoards,
    getCurrentDataSourceProperties,
    updateAllNotes,
    getNotesByDataSourceId,
  } = useBoard();
  const { user } = useAuth();
  const { workspaceMembers } = useWorkspaceContext();
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentViewData = currentView[board._id];
  const latestBoard = contextBoards.find((b) => b._id === board._id) || board;

  // Get current view with form icon and cover
  const currentViewWithMetadata = useMemo(() => {
    const viewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (viewData?.id) {
      view = latestBoard.viewsType?.find((vt) => vt.id === viewData.id);
    } else if (viewData?.type) {
      view = latestBoard.viewsType?.find((vt) => vt.viewType === viewData.type);
    }
    
    return view;
  }, [currentView, board, contextBoards]);

  const formIcon = currentViewWithMetadata?.formIcon || "";
  const formCoverImage = currentViewWithMetadata?.formCoverImage || null;
  const formTitle = currentViewWithMetadata?.formTitle ||"Form title";
  const formDescription = currentViewWithMetadata?.formDescription ||"";

  const getCurrentDataSourceId = (): string | null => {
    let view;
    if (currentViewData?.id) {
      view = latestBoard.viewsType?.find((vt) => vt.id === currentViewData.id);
    } else if (currentViewData?.type) {
      view = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
    }
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };

  const boardProperties = useMemo(() => {
    return getCurrentDataSourceProperties(board._id) || board.properties || {};
  }, [board, getCurrentDataSourceProperties]);

  // Allowed property types for forms (from FormAddPropertyDialog)
  const allowedFormPropertyTypes = useMemo(() => {
    return new Set<BoardProperty["type"]>(
      FORM_PROPERTY_TYPES.map((type) => type.propertyType as BoardProperty["type"])
    );
  }, []);

  const formQuestions = useMemo(() => {
    return Object.entries(boardProperties)
      .filter(([, property]) => allowedFormPropertyTypes.has(property.type))
      .map(([propertyId, property]) => ({
        propertyId,
        property,
        isRequired: property.formMetaData?.isFiedRequired || false,
        description: property.formMetaData?.Description || "",
      }));
  }, [boardProperties, allowedFormPropertyTypes]);

  const handleInputChange = (propertyId: string, value: any) => {
    setFormResponses((prev) => ({
      ...prev,
      [propertyId]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const missingFields = formQuestions
      .filter((q) => q.isRequired && !formResponses[q.propertyId])
      .map((q) => q.property.name);

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("No data source found");
      return;
    }

    setIsSubmitting(true);
    try {
      const databaseProperties: Record<string, any> = {};
      Object.entries(formResponses).forEach(([propertyId, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          databaseProperties[propertyId] = value;
        }
      });

      const title = "New page";

      const { page: newPage } = await addRootPage(
        title,
        null,
        false,
        null,
        false,
        dataSourceId,
        databaseProperties,
        undefined,
      );

      const serverNote: Note = {
        _id: newPage.id,
        title: newPage.title,
        content: newPage.content,
        description: newPage.description || "",
        noteType: newPage.noteType || "Viewdatabase_Note",
        databaseProperties: newPage.databaseProperties || {},
        contentPath: newPage.contentPath || "",
        commitSha: newPage.commitSha || "",
        comments: newPage.comments || [],
      };

      const existingNotes = getNotesByDataSourceId(dataSourceId) || [];
      updateAllNotes(dataSourceId, [...existingNotes, serverNote]);

      toast.success("Form submitted successfully!");
      setFormResponses({});
      onClose();
    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative z-[510] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-2xl">
        <div className=" absolute right-2 top-2 z-[511] bg-background rounded-md p-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted transition"
              aria-label="Edit Form"
            >
              <EditIcon className="w-4 h-4 text-gray-600" />
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted transition"
              aria-label="Copy link"
            >
              <Link className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Cover Image with overlapping icon */}
        <div className="relative w-full">
          {formCoverImage && (
            <div className="relative w-full h-[30vh] max-h-[280px] flex-shrink-0">
              <img
                src={formCoverImage}
                alt="Form cover"
                className="w-full h-full object-cover m-0"
                style={{ objectPosition: "center 50%" }}
              />
            </div>
          )}
          
          {/* Icon positioned to overlap cover image (half over cover) or with proper spacing when no cover */}
          {formIcon && (
            <div className={`absolute left-20 ${formCoverImage ? '-bottom-10' : 'top-16'}`}>
              <div className="text-6xl leading-none">
                {formIcon}
              </div>
            </div>
          )}
        </div>

        {/* Add top padding when no cover to create space above title */}
        <div className={`px-20 ${formCoverImage ? (formIcon ? 'pt-16' : 'pt-12') : (formIcon ? 'pt-[170px]' : 'pt-20')} pb-20`}>
          <div className="mb-6 px-3">
            {/* Title below icon */}
            <div>
              <h1 className="text-4xl font-bold text-foreground leading-tight">
                {formTitle}
              </h1>
              {formDescription && (
                <p className="mt-2 text-base text-muted-foreground whitespace-pre-wrap">
                  {formDescription}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2">
                  Submitting responses as
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-transparent group-hover:border-gray-300 dark:group-hover:border-[rgb(42,42,42)] transition-colors">
                    {user?.image && (
                      <Image
                      src={user.image}
                      alt="Profile"
                      fill
                      className="object-cover m-0"
                      />
                    )}
                  </div>
                  <span className="font-medium text-muted-foreground">{user?.name}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {formQuestions.map((question) => (
              <FormQuestionCard
                key={question.propertyId}
                propertyId={question.propertyId}
                property={question.property}
                value={formResponses[question.propertyId]}
                onChange={(value) => handleInputChange(question.propertyId, value)}
                onUpdate={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                disableResponseInput={false}
                showActionsMenu={false}
                editable={false}
                cardClassName=" bg-background"
                availableMembers={workspaceMembers || []}
              />
            ))}

            {formQuestions.length > 0 && (
              <div className="flex justify-start pt-2 px-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

