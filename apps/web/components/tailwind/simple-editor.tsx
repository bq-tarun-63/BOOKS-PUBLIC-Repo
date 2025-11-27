"use client";
import { NoAccessMessage } from "@/components/ui/no-access";
// import { useShare } from "@/contexts/ShareContext";
import { useAuth } from "@/hooks/use-auth";
import { useNotes } from "@/hooks/use-notes";
import { checkUserWriteAccess, isOwner } from "@/services-frontend/user/userServices";
import { approveNote, inviteToNote, publishNote } from "@/services-frontend/note/notesService";
// Declare the global variable for TypeScript
declare global {
  interface Window {
    __aiPromptContent?: string;
  }
}
// import { useSyncQueue } from "@/hooks/use-syncQueue";
import { usePromptForPageTitle } from "@/hooks/use-promptForPageTitle";
import useNoteActions from "@/hooks/use-updateNode";
import { useCollaborativeEditor } from "@/hooks/useCollaborativeEditor";
import { getWithAuth, postWithAuth } from "@/lib/api-helpers";
import type { publishState } from "@/lib/api-helpers";
import { defaultEditorContent } from "@/lib/content";
import { useQueryClient } from "@tanstack/react-query";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { ErrorPage } from "./ErrorPage";
import { NotFoundPage } from "./NotFoundPage";
import { defaultExtensions } from "./extensions";
import { uploadFn } from "./image-upload";
import { getSlashCommand, getSuggestionItems } from "./slash-command";
import { createMentionExtension } from "./mention-command";

import { useNoteContext } from "@/contexts/NoteContext";
import { useRouter } from "next/navigation";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TableToolbar } from "./selectors/table-toolbar";
import { TextButtons } from "./selectors/text-buttons";

import type { Editor } from "@tiptap/core";

// At the top of your component file
import type { AdvancedEditorProps, ApiError, Invite, NoteResponse, PendingTitle } from "@/types/advance-editor";
import { OpenAI } from "openai";
import { AISelector } from "./generative/ai-selector";
import { Separator } from "./ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { isEditorContentEmpty, isPublishResponse } from "@/services-frontend/editor/editorService";
import EditorHeader from "./editor/editorHeader";
import EditorLoading from "./editor/editorLoading";
import CoverImage from "./editor/CoverImage";
import { EmbedModalWrapper } from "./ui/embed-modal-wrapper";



const hljs = require("highlight.js");


const TailwindNewEditor = ({ editorKey, shareNoteId, onShareComplete }: AdvancedEditorProps) => {
  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<"Saving..." | "Saved" | "Save Failed" | "Saved Online" | "Unsaved">(
    "Saved",
  );

  const [openNode, setOpenNode] = useState<boolean>(false);
  const [openColor, setOpenColor] = useState<boolean>(false);
  const [openLink, setOpenLink] = useState<boolean>(false);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessError, setAccessError] = useState<ApiError | null>(null);
  const [notFoundError, setNotFoundError] = useState<{
    noteId: string;
    message: string;
  } | null>(null);
  const [genericError, setGenericError] = useState<{
    status: number;
    message: string;
    noteId?: string;
  } | null>(null);

  // Track handled errors to prevent infinite loops
  const handledErrorRef = useRef<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [invites, setInvites] = useState<Invite[]>([{ email: "", permission: "read" }]);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // const { setShareNoteId, removeSharedPage } = useShare();
  const [publishLoading, setPublishLoading] = useState<boolean>(false);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [approvalDirection, setApprovalDirection] = useState<"approve" | "reject" | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("");
  const [githubRawUrl, setGithubRawUrl] = useState<string>("");
  const [publishStatus, setPublishStatus] = useState<publishState>();
  const [isPublish, setIsPublish] = useState<boolean>();
  const [noteOwnerMail, setNoteOwnerMail] = useState<string>("");
  const [noteOwnerUserId, setNoteOwnerUserId] = useState<string>("");
  // const [editorTitle, setEditorTitle] = useState<string>("Untitled");
  const [titleIcon, setTitleIcon] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("default");
  const [showCoverPicker, setShowCoverPicker] = useState<boolean>(false);

  const prevContentRef = useRef<any>(null);
  const prevEditorKey = useRef(editorKey);
  const [isPublicNote, setIsPublicNote] = useState<boolean>(false);
  const [noteType, setNoteType] = useState<string>("original");
  const [ rootNodes , setRootNodes ] = useState<Node[]>([]);

  // Auth hook
  const { user } = useAuth();

  // React Query hooks
  const queryClient = useQueryClient();
  const { getNote, updateNote: updateNoteWithQuery } = useNotes();

  // Use React Query to fetch note data
  const {
    data: noteQueryData,
    isError: isNoteError,
    error: noteError,
    isLoading: isNoteLoading,
    refetch: refetchNote,
  } = getNote(
    editorKey,
    true, // includeContent
    "", // commitSha
    "", // commitPath
  );

  const { promptForPageTitle, modal } = usePromptForPageTitle();
  
  // Cover handlers
  const handleAddCover = () => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      return;
    }
    // Open the cover picker
    setShowCoverPicker(true);
  };

  const handleCoverChange = async (newCover: string) => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      return;
    }
    console.log('Saving cover to database:', newCover);
    setCoverUrl(newCover);
    
    // Persist to database
    try {
      const result = await updateNoteWithQuery(editorKey, editorTitle, parentId, titleIcon, newCover);
      console.log('Cover save result:', result);
      updateNodeInCache(editorKey, editorTitle, titleIcon, newCover);
      
      queryClient.invalidateQueries({
        queryKey: ["notes", "detail", editorKey],
      });
      
      toast.success("Cover updated successfully!");
    } catch (error) {
      console.error("Error updating cover:", error);
      toast.error("Failed to update cover");
    }
  };

  const handleCoverRemove = async () => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      return;
    }
    setCoverUrl(null);
    
    // Persist to database
    try {
      await updateNoteWithQuery(editorKey, editorTitle, parentId, titleIcon, null);
      updateNodeInCache(editorKey, editorTitle, titleIcon, null);
      
      queryClient.invalidateQueries({
        queryKey: ["notes", "detail", editorKey],
      });
      
      toast.success("Cover removed successfully!");
    } catch (error) {
      console.error("Error removing cover:", error);
      toast.error("Failed to remove cover");
    }
  };

  const handleUploadCover = async (file: File): Promise<string> => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      throw new Error("Unauthorized");
    }
    const formData = new FormData();
    formData.append("file", file);
    
    // Get workspace ID from note or user context
    const userString = window.localStorage.getItem("auth_user");
    const user = userString ? JSON.parse(userString) : null;
    const workspaceId = user?.workspaceId || 'default';
    formData.append("workspaceId", workspaceId);

    const response = await fetch("/api/note/upload-cover", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  const {
    notes,
    updateNote,
    activeTitle,
    activeEmoji,
    selectedNoteId,
    setIsContentSynced,
    isDirtyRef,
    setNotes,
    updateNodeInCache,
    isTitleDirtyRef,
    setSocketConnected,
    editorTitle,
    setEditorTitle,
    isPremiumUser,
    childrenNotes,
    setChildrenNotes,
    setDocumentTitle,
    setSharedWith,
    setIsCurrentNoitePublic,
  } = useNoteContext();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLDivElement | null>(null);

  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [isRestrictedPage, setIsRestrictedPage] = useState<boolean | undefined>(undefined);
  const [isLeader, setIsLeader] = useState(false);
  const isLeaderRef = useRef(isLeader);
  const [isSharedNote, setIsSharedNote] = useState<boolean>(false);
  const pendingTitleMap = useRef<Record<string, string>>({});
  const [pendingTitle, setPendingTitle] = useState<string>("");
  const [aiSelectorOpen, setAISelectorOpen] = useState(false);
  const [aiSelectorPosition, setAISelectorPosition] = useState<{ left: number; top: number } | null>(null);
  const [isSlashCommandAIOpen, setIsSlashCommandAIOpen] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any | null>(null); // Store editor instance - any needed for Novel editor API
  const router = useRouter();

  const { socketConnected , initialSyncDone} = useCollaborativeEditor({ 
    editor: editorRef.current,
    editorKey,
    mode: isPublicNote ? true : false || isSharedNote,
    onSetLeader: setIsLeader,
    isRestrictedPage: isRestrictedPage as boolean,
    noteType,
  });
const { mentionUser } = useNotifications();

  useEffect(() => {
    setSocketConnected(socketConnected);
    if (socketConnected) {
      console.log("In the conntection Established");
    }
    if (!socketConnected) {
      // Optionally, set a flag to disable real-time features, but DO NOT reset content.
    }
  }, [socketConnected]);

  useEffect(()=>{
    if(initialSyncDone){
      setIsLoading(false)

      if(noteType == "original"){
        setTimeout(() => {
          isDirtyRef.current = false;
          const json = editorRef?.current?.getJSON();
          prevContentRef.current = json;
        }, 500);       
      }
    };
  },[initialSyncDone]);

  // Add event listener to handle AI content insertion from chat
  useEffect(() => {
    // Handler function for the custom event
    const handleAIContentInsertion = (event: CustomEvent) => {
      if (!editorRef.current) return;

      const content = event.detail?.content;
      if (!content) return;

      try {
        // Get the editor instance
        const editor = editorRef.current;

        // Move to the end of the document and focus
        // First ensure we're at the end of the document
        const endPosition = editor.state.doc.content.size;
        editor.chain().focus().setTextSelection(endPosition).run();

        // Trigger the AI selector at the current position
        // Open AI selector at the end of the document
        openAISelectorAtSelection();

        // Log that we've triggered the selector

        // We need to set a longer timeout to ensure the AI selector is fully open before we try to input content
        setTimeout(() => {
          // Try to find the CommandInput element - try multiple selectors based on the exact HTML structure
          const inputElement = document.querySelector(
            "[cmdk-input], input[placeholder*='Ask AI'], input.flex.h-11.w-full.rounded-md.bg-transparent",
          );

          if (inputElement instanceof HTMLInputElement) {
            // Set the value
            inputElement.value = content;

            // Focus the input element
            inputElement.focus();

            // Dispatch input event to trigger the AI completion logic
            const inputEvent = new Event("input", { bubbles: true });
            inputElement.dispatchEvent(inputEvent);

            // This is critical - we need to trigger the onValueChange handler in the CommandInput component
            // Create a custom event that will be picked up by React's synthetic event system
            const reactChangeEvent = new Event("change", { bubbles: true });
            Object.defineProperty(reactChangeEvent, "target", { value: inputElement });
            inputElement.dispatchEvent(reactChangeEvent);

            // Find and click the submit button with a longer delay
            setTimeout(() => {
              // Try multiple selector patterns to find the button based on the exact HTML structure
              // Target the button that's next to the input with the specific classes from the HTML
              let submitButton = document.querySelector(
                "button.absolute.right-2.top-1\\/2.h-6.w-6.-translate-y-1\\/2.rounded-full.bg-\\[\\#5E7CE2\\], " +
                  "button.rounded-full.bg-\\[\\#5E7CE2\\], " +
                  ".absolute.right-2.top-1\\/2 button, " +
                  "[cmdk-input-wrapper] + button, " +
                  "div.relative > button",
              );

              // If that doesn't work, try to find the button by looking for the ArrowUp icon
              if (!submitButton) {
                const allButtons = document.querySelectorAll("button");
                for (const btn of allButtons) {
                  if (btn.querySelector("svg.lucide-arrow-up")) {
                    submitButton = btn;

                    break;
                  }
                }
              }

              if (submitButton && submitButton instanceof HTMLButtonElement) {
                // Before clicking the button, let's create a global variable to store the prompt
                // This will be used by the AI selector component
                window.__aiPromptContent = content;

                // Add a custom attribute to the button to identify it as having our prompt
                submitButton.setAttribute("data-ai-prompt", content);

                // Now click the button
                submitButton.click();
                toast.success("AI prompt submitted");
              } else {
                // Try to find any button inside the AI selector by targeting the exact structure from the HTML
                const anyButton = document.querySelector(
                  "div.relative > button.absolute.right-2, div.relative > button",
                );
                if (anyButton && anyButton instanceof HTMLButtonElement) {
                  // Set global variable and attribute
                  window.__aiPromptContent = content;
                  anyButton.setAttribute("data-ai-prompt", content);

                  anyButton.click();
                  toast.success("AI prompt submitted via alternative button");
                  return;
                }

                // Try to find the AI selector component based on the exact HTML structure
                const aiSelector = document.querySelector(
                  "div.relative, div:has([cmdk-input]), div:has(input[placeholder*='Ask AI'])",
                );
                if (aiSelector) {
                  const buttons = aiSelector.querySelectorAll("button");

                  // Find the button with ArrowUp icon or similar
                  for (const btn of buttons) {
                    // Look for the button with the specific structure from the HTML
                    if (
                      btn.querySelector("svg.lucide-arrow-up") ||
                      btn.classList.contains("rounded-full") ||
                      btn.classList.contains("absolute") ||
                      btn.classList.contains("right-2")
                    ) {
                      btn.click();
                      toast.success("AI prompt submitted via icon button");
                      return;
                    }
                  }
                }

                // Try direct DOM manipulation as a last resort
                // Try to get all buttons in the document and find one with arrow-up icon
                const allButtons = document.querySelectorAll("button");

                // Look for a button with arrow-up SVG
                let foundButton = false;
                allButtons.forEach((btn, i) => {
                  const btnHTML = btn.innerHTML;
                  if (
                    btnHTML.includes("arrow-up") ||
                    btnHTML.includes("lucide-arrow-up") ||
                    btn.classList.contains("rounded-full")
                  ) {
                    btn.click();
                    foundButton = true;
                    toast.success("AI prompt submitted via found button");
                    return;
                  }
                });

                // Try to find the button by its position relative to the AI input
                if (!foundButton) {
                  const inputParent = inputElement.closest(".relative");
                  if (inputParent) {
                    const nearbyButton = inputParent.querySelector("button");
                    if (nearbyButton) {
                      nearbyButton.click();
                      foundButton = true;
                      toast.success("AI prompt submitted via nearby button");
                      return;
                    }
                  }
                }

                // If still no button found, try Enter key
                if (!foundButton) {
                  // Try to trigger the handleAIComplete function by simulating an Enter key press
                  const enterEvent = new KeyboardEvent("keydown", {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                  });
                  inputElement.dispatchEvent(enterEvent);

                  // Also try to trigger a form submission as a fallback
                  setTimeout(() => {
                    const form = inputElement.closest("form");
                    if (form) {
                      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
                      form.dispatchEvent(submitEvent);
                    }
                  }, 100);

                  toast.success("AI prompt submitted via Enter key");
                }
              }
            }, 300); // Longer delay to ensure button is ready
          } else {
            toast.error("Couldn't find AI input field");
          }
        }, 500); // Increased timeout to ensure selector is fully open

        // We don't show success immediately as the actual content generation will happen asynchronously
      } catch (error) {
        console.error("Error triggering AI content generation:", error);
        toast.error("Failed to trigger AI content generation");
      }
    };

    // Add event listener
    window.addEventListener("insert-ai-content", handleAIContentInsertion as EventListener);

    // Also check URL for ai_content parameter when loading
    const checkURLForContent = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const aiContent = urlParams.get("ai_content");

        if (aiContent && editorRef.current) {
          // Remove the parameter from URL without refreshing
          window.history.replaceState({}, document.title, window.location.pathname);

          // Wait a bit for the editor to fully initialize
          setTimeout(() => {
            // Move to the end of the document and focus
            editorRef.current?.chain().focus().selectTextblockEnd().run();

            // Open the AI selector and trigger the prompt
            openAISelectorAtSelection();

            // Set the decoded content in the input field after a longer delay
            setTimeout(() => {
              const inputElement = document.querySelector("[cmdk-input]");
              if (inputElement instanceof HTMLInputElement) {
                console.log("URL param: Found input element, setting value:", aiContent);

                // Set the value
                inputElement.value = decodeURIComponent(aiContent);

                // Focus the input element
                inputElement.focus();

                // Dispatch input event to trigger the AI completion logic
                const inputEvent = new Event("input", { bubbles: true });
                inputElement.dispatchEvent(inputEvent);

                console.log("URL param: Input event dispatched");

                // Find and click the submit button with a longer delay
                setTimeout(() => {
                  console.log("URL param: Looking for submit button");
                  // Try multiple selector patterns to find the button based on the exact HTML structure
                  // Target the button that's next to the input with the specific classes from the HTML
                  const submitButton = document.querySelector(
                    "button.absolute.right-2.top-1\\/2.h-6.w-6.-translate-y-1\\/2.rounded-full.bg-\\[\\#5E7CE2\\], " +
                      "button.rounded-full.bg-\\[\\#5E7CE2\\], " +
                      ".absolute.right-2.top-1\\/2 button, " +
                      "[cmdk-input-wrapper] + button, " +
                      "div.relative > button",
                  );

                  if (submitButton && submitButton instanceof HTMLButtonElement) {
                    console.log("URL param: Found submit button, clicking");
                    submitButton.click();
                    toast.success("AI prompt submitted");
                  } else {
                    console.log("URL param: Submit button not found, trying alternative approaches");

                    // Try to find any button inside the AI selector by targeting the exact structure from the HTML
                    const anyButton = document.querySelector(
                      "div.relative > button.absolute.right-2, div.relative > button",
                    );
                    if (anyButton && anyButton instanceof HTMLButtonElement) {
                      console.log("URL param: Found alternative button, clicking");
                      anyButton.click();
                      toast.success("AI prompt submitted via alternative button");
                      return;
                    }

                    // Try to find the AI selector component based on the exact HTML structure
                    const aiSelector = document.querySelector(
                      "div.relative, div:has([cmdk-input]), div:has(input[placeholder*='Ask AI'])",
                    );
                    if (aiSelector) {
                      console.log("URL param: Found AI selector container, looking for button inside");
                      const buttons = aiSelector.querySelectorAll("button");
                      console.log(`URL param: Found ${buttons.length} buttons in AI selector`);

                      // Find the button with ArrowUp icon or similar
                      for (const btn of buttons) {
                        // Look for the button with the specific structure from the HTML
                        if (
                          btn.querySelector("svg.lucide-arrow-up") ||
                          btn.classList.contains("rounded-full") ||
                          btn.classList.contains("absolute") ||
                          btn.classList.contains("right-2")
                        ) {
                          console.log("URL param: Found button with icon, clicking");
                          btn.click();
                          toast.success("AI prompt submitted via icon button");
                          return;
                        }
                      }
                    }

                    // Last resort: Simulate pressing Enter key
                    console.log("URL param: No buttons found, trying Enter key simulation");
                    const enterEvent = new KeyboardEvent("keydown", {
                      key: "Enter",
                      code: "Enter",
                      keyCode: 13,
                      which: 13,
                      bubbles: true,
                      cancelable: true,
                    });
                    inputElement.dispatchEvent(enterEvent);
                    toast.success("AI prompt submitted via Enter key");
                  }
                }, 300); // Longer delay to ensure button is ready
              } else {
                console.error("URL param: AI input field not found");
              }
            }, 500);
          }, 500);
        }
      } catch (error) {
        console.error("Error processing AI content from URL:", error);
      }
    };

    // Check once after the editor is loaded
    if (editorRef.current) {
      checkURLForContent();
    }

    // Clean up
    return () => {
      window.removeEventListener("insert-ai-content", handleAIContentInsertion as EventListener);
    };
  }, [editorRef.current]);

  const handlePageCreated = (href: string) => {
    router.push(href); 
  };

  function openAISelectorAtSelection() {
    if (editorRef.current) {
      setOpenAI(false);

      const selection = editorRef.current.view.state.selection;
      const coords = editorRef.current.view.coordsAtPos(selection.from);

      const editorContainer = editorRef.current.options.element;
      const editorRect = editorContainer.getBoundingClientRect();

      let left = coords.left - editorRect.left + 10;
      const top = coords.bottom - editorRect.top + 200;

      const aiSelectorWidth = 400;
      const maxLeft = Math.min(editorRect.width, window.innerWidth) - aiSelectorWidth - 20;
      if (left > maxLeft) {
        left = maxLeft;
      }
      if (left < 10) {
        left = 10;
      }

      setAISelectorPosition({ left, top });
      setAISelectorOpen(true);
      setIsSlashCommandAIOpen(true);

      // Log that we've opened the selector
      console.log("AI selector opened, position set to", { left, top });

      // Debugging: Check if we can find the AI selector in the DOM after a short delay
      setTimeout(() => {
        const aiSelectorElements = document.querySelectorAll(
          ".h-full.flex-col.overflow-hidden.text-popover-foreground",
        );
        console.log(`Found ${aiSelectorElements.length} AI selector elements`);

        const inputElements = document.querySelectorAll("input[placeholder*='Ask AI']");
        console.log(`Found ${inputElements.length} AI input elements`);

        const buttonElements = document.querySelectorAll("button.rounded-full.bg-\\[\\#5E7CE2\\]");
        console.log(`Found ${buttonElements.length} AI submit buttons`);

        // Try to find the button directly using the exact structure from the HTML
        const exactButtonSelector =
          "div.relative > button.absolute.right-2.top-1\\/2.h-6.w-6.-translate-y-1\\/2.rounded-full.bg-\\[\\#5E7CE2\\]";
        const exactButton = document.querySelector(exactButtonSelector);
        console.log(`Found exact button match: ${exactButton ? "YES" : "NO"}`);

        // Try with a simpler selector
        const simpleButtons = document.querySelectorAll("button");
        console.log(`Found ${simpleButtons.length} total buttons`);
        simpleButtons.forEach((btn, i) => {
          console.log(`Button ${i}: class="${btn.className}", innerHTML="${btn.innerHTML.substring(0, 50)}..."`);
        });
      }, 200);
    }
  }

  const suggestionItems = useMemo(
    () => getSuggestionItems(editorKey, promptForPageTitle, handlePageCreated, openAISelectorAtSelection ),
    [editorKey, promptForPageTitle],
  );
  const slashCommand = useMemo(() => getSlashCommand(editorKey, promptForPageTitle), [editorKey, promptForPageTitle]);

  const extensions = useMemo(
    () => [...defaultExtensions, slashCommand, createMentionExtension(mentionUser)],
    [slashCommand, mentionUser]
  );

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  // Nothing needed here - we're using the existing Ask AI functionality instead

  const debouncedUpdates = useDebouncedCallback(async (editor: Editor) => {
    const json = editor.getJSON();
    window.localStorage.setItem(`html-content-${editorKey}`, highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem(`novel-content-${editorKey}`, JSON.stringify(json));
    window.localStorage.setItem(`markdown-${editorKey}`, editor.storage.markdown.getMarkdown());
    window.localStorage.setItem(`offline_content_time-${editorKey}`, JSON.stringify(new Date()));
    isDirtyRef.current = true;
    setIsContentSynced(false);
    setSaveStatus("Saved");

    if (isEditorContentEmpty(json)) {
      prevContentRef.current = json; // mark this structure as the baseline
      isDirtyRef.current = false;
      return;
    }

    setTimeout(()=>{
      if (JSON.stringify(json) == JSON.stringify(prevContentRef.current)) {
        // If the content didn't change, don't do anything.
        isDirtyRef.current = false;
        return;
      }
    } , 500);
    
  }, 2000);

  function updateTitleDeep(nodeList: any[], editorKey: string, newTitle: string): any[] {
    return nodeList.map((node) => {
      if (node.id === editorKey || node._id === editorKey) {
        return { ...node, title: newTitle };
      }

      if (node.children && Array.isArray(node.children)) {
        return {
          ...node,
          children: updateTitleDeep(node.children, editorKey, newTitle),
        };
      }

      return node;
    });
  }

  const handlePublish = async (editorKey: string) => {
    setPublishLoading(true); // Start loading
    const response = await publishNote(editorKey);
    setPublishLoading(false); // Stop loading
    
    if (isPublishResponse(response) && response.approvalStatus) {
      setPublishStatus(response.approvalStatus);
    }
  };





  const handleApproval = async (editorKey: string, approved: boolean) => {
    setApprovalLoading(true);
    setApprovalDirection(approved ? "approve" : "reject");

    const response = await approveNote(editorKey, approved, noteOwnerMail);

    // Safely access response.note if it exists
    if ("note" in response && response.note) {
      const note = response.note as NoteResponse;

      if (note.approvalStatus) {
        setApprovalStatus(note.approvalStatus);
      }
      if (note.githubRawUrl) {
        setGithubRawUrl(note.githubRawUrl);
      }
    }
    setApprovalLoading(false);
    setApprovalDirection(null);

  };

  const debouncedUpdatesOnline = useDebouncedCallback(async (editor: Editor) => {
    if (!socketConnected) {
      // it helps to prevent the content loss when socket not active
      return;
    }

    //Do not run for review or published page
    if(noteType !== 'original') return ;
    
    const json = editor.getJSON();

    // ✅ Do not run if not leader or not a publicNote for checking socket
    if (isPublicNote && !isLeaderRef.current) return;
    // Check if the content has changed
    if (isPublicNote && !isLeaderRef.current && JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
      isDirtyRef.current = false;
      return; // No changes, skip API call
    }

    if (isPublicNote && JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
      isDirtyRef.current = false;
      return; // No changes, skip API call
    }

    if (!isPublicNote && JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
      isDirtyRef.current = false;
      return;
    }
    // if (!isPublicNote && !isLeaderRef.current) return;
    if (JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
      isDirtyRef.current = false;
      return;
    }

    // Update the reference to current content
    isDirtyRef.current = true;
    const pageName = `docs/notes/${editorKey}`;

    try {
      const response = await postWithAuth(
        "/api/note/uploadContent",
        {
          online_content: json,
          online_content_time: new Date(),
        },
        {
          headers: {
            "x-vercel-pagename": pageName,
          },
        },
      );

      // Check if response is an error
      if ("isError" in response && response.isError) {
        console.error("Error saving content online:", response.message);
        setSaveStatus("Save Failed");
        return;
      }
      const uploadContentResponse = response as NoteResponse;
      const updatedAt = uploadContentResponse?.updatedAt;

      setPublishStatus("Publish");
      isDirtyRef.current = false;
      setIsContentSynced(true);

      window.localStorage.setItem(`html-content-${editorKey}`, highlightCodeblocks(editor.getHTML()));
      window.localStorage.setItem(`novel-content-${editorKey}`, JSON.stringify(json));
      window.localStorage.setItem(`markdown-${editorKey}`, editor.storage.markdown.getMarkdown());
      window.localStorage.setItem(`offline_content_time-${editorKey}`, JSON.stringify(new Date()));
      window.localStorage.setItem(`last_content_update_time-${editorKey}`, JSON.stringify(updatedAt));

      setSaveStatus("Saved Online");
      prevContentRef.current = json;

      let pendingTitle: string | undefined;
      let pendingTitleParentId: string | null = null;
      let titleIcon: string | null = null;
      const pendingTitleObj = localStorage.getItem(`pending-title-${editorKey}`);

      if (pendingTitleObj) {
        // const pendingTitleObj = localStorage.getItem(`pending-title-${editorKey}`)
        if (pendingTitleObj) {
          try {
            const parsedObj = JSON.parse(pendingTitleObj) as PendingTitle;
            pendingTitle = parsedObj.newTitle;
            pendingTitleParentId = parsedObj.parentId;
            titleIcon = parsedObj.titleIcon;
          } catch (err) {
            console.error("Error in fetching new Title name", err);
          }
        }
        try {
          await updateNote(editorKey, pendingTitle as string, pendingTitleParentId, titleIcon);
          isTitleDirtyRef.current = false;
          localStorage.removeItem(`pending-title-${editorKey}`);
          delete pendingTitleMap.current[editorKey]; // ✅ Clear after successful update
        } catch (err) {
          toast.error("Error in updating name", err);
          console.error("❌ Failed to update title:", err);
        }
      }
      // After successful save, push markdown to vector DB (frontend) using ORIGINAL note owner's details
      const markdown = editor.storage.markdown.getMarkdown();
      const noteId = editorKey;
      // Get current user as fallback if owner info is missing
      const userString = window.localStorage.getItem("auth_user");
      const currentUser = userString ? JSON.parse(userString) : null;

      // Use the original note owner's user ID and email instead of current user
      // Fall back to current user only if owner info is completely missing
      const metadata = {
        title: editorTitle,
        userId: noteOwnerUserId || currentUser?.id, // Prefer original owner ID
        userEmail: noteOwnerMail || currentUser?.email, // Prefer original owner email
        updatedAt: new Date().toISOString(),
      };
      // await syncMarkdownToVectorDB({ noteId, markdown, metadata });
      return response;
    } catch (error) {
      console.error("Network error saving content online:", error);
      setSaveStatus("Save Failed");
    }
  }, 10000);

  useEffect(() => {
    const pendingTitle = localStorage.getItem(`pending-title-${editorKey}`);
    if (pendingTitle) {
      pendingTitleMap.current[editorKey] = pendingTitle;
      isTitleDirtyRef.current = true;
    }
  }, [editorKey]);

  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  useEffect(() => {

    if (!editorInstance || !isLeader) return;
    const handleUpdate = () => {
      debouncedUpdatesOnline(editorInstance); // 👈 Only leader will trigger
    };
    editorInstance.on("update", handleUpdate);

    return () => {
      editorInstance.off("update", handleUpdate);
    };
  }, [editorInstance, isLeader, debouncedUpdatesOnline]);

  // Handle React Query data
  useEffect(() => {
    // Reset handled error when editor key changes
    if (editorKey !== prevEditorKey.current) {
      handledErrorRef.current = null;
      prevEditorKey.current = editorKey;
      
      // Check if this is a new note and reset title
      const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
      const isOptimisticNote = optimisticIds.includes(editorKey);
      const recentlyCreated = Date.now() - parseInt(localStorage.getItem(`note-created-${editorKey}`) || "0") < 30000;
      
      if (isOptimisticNote || recentlyCreated) {
        console.log("New note detected on editorKey change, resetting title");
        setEditorTitle("Untitled");
        setDocumentTitle("Untitled");
        setTitleIcon("");
        setPendingTitle("");
      }
    }

    // Skip invalid editorKey values
    if (!editorKey || editorKey === "notes" || editorKey === "undefined") {
      setInitialContent(defaultEditorContent);
      setTimeout(() => setIsLoading(false), 300);
      return;
    }

    if (isNoteLoading) {
      setIsLoading(true);
      
      // Add a timeout to prevent infinite loading for new notes
      const loadingTimeout = setTimeout(() => {
        if (isNoteLoading) {
          console.log("Loading timeout reached, setting default content for potential new note");
          const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
          const isOptimisticNote = optimisticIds.includes(editorKey);
          const recentlyCreated = Date.now() - parseInt(localStorage.getItem(`note-created-${editorKey}`) || "0") < 30000;
          
          if (isOptimisticNote || recentlyCreated) {
            setInitialContent(defaultEditorContent);
            setReadOnly(false);
            setIsLoading(false);
            
            // Set default title for new notes and clear any cached pending title
            setEditorTitle("Untitled");
            setDocumentTitle("Untitled");
            setTitleIcon("");
            setNoteType("original");
            setPendingTitle("");
            localStorage.removeItem(`pending-title-${editorKey}`);
          }
        }
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(loadingTimeout);
    }

    if (isNoteError && noteError) {
      // Create a unique error key to track if we've handled this specific error
      const errorKey = `${editorKey}-${noteError.message}`;

      // Skip if we've already handled this exact error
      if (handledErrorRef.current === errorKey) {
        return;
      }

      // Mark this error as handled
      handledErrorRef.current = errorKey;

      // Handle errors - for new notes, 404 is expected, so create default content
      if (noteError.message.includes("404") || noteError.message.includes("not found")) {
        // Check if this might be a new note by looking for optimistic IDs or recent creation
        const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
        const isOptimisticNote = optimisticIds.includes(editorKey);
        
        // Also check if this is a recently created note (within last 30 seconds)
        const recentlyCreated = Date.now() - parseInt(localStorage.getItem(`note-created-${editorKey}`) || "0") < 30000;
        
        if (isOptimisticNote || recentlyCreated) {
          // This is a new note, set default content and allow editing
          console.log("New note detected (optimistic or recently created), setting default content");
          setInitialContent(defaultEditorContent);
          setReadOnly(false);
          setIsLoading(false);
          
          // Set default title for new notes and clear any cached pending title
          setEditorTitle("Untitled");
          setDocumentTitle("Untitled");
          setTitleIcon("");
          setNoteType("original");
          setPendingTitle("");
          localStorage.removeItem(`pending-title-${editorKey}`);
          
          return;
        }
        
        window.localStorage.setItem(`404-error-${editorKey}`, "true");
        window.localStorage.removeItem(`readOnly-${editorKey}`);
        setNotFoundError({
          noteId: editorKey,
          message: "Note not found",
        });
      } else if (noteError.message.includes("403") || noteError.message.includes("access denied")) {
        window.localStorage.removeItem(`readOnly-${editorKey}`);
        setAccessError({
          message: "Access denied",
          status: 403,
          error: "NOT_AUTHORIZED",
          noteId: editorKey,
        });
      } else if (noteError.message.includes("Invalid note ID")) {
        window.localStorage.setItem(`404-error-${editorKey}`, "true");
        window.localStorage.removeItem(`readOnly-${editorKey}`);
        setNotFoundError({
          noteId: editorKey,
          message: "Note not found",
        });
      } else {
        window.localStorage.removeItem(`readOnly-${editorKey}`);
        setGenericError({
          status: 500,
          message: noteError.message,
          noteId: editorKey,
        });
      }
      setIsLoading(false);
      return;
    }
    if (noteQueryData) {
      // Process successful response
      const noteResponse = noteQueryData;

      // Set note metadata
      setNoteOwnerMail(noteResponse.userEmail || "");
      setPublishStatus(noteResponse.approvalStatus);
      setApprovalStatus(noteResponse.approvalStatus);
      setGithubRawUrl(noteResponse.githubRawUrl);
      setIsPublish(noteResponse.isPublish);
      setEditorTitle(noteResponse.title);
      setDocumentTitle(noteResponse.title);
      setTitleIcon(noteResponse.icon || "");
      const coverUrlValue = typeof noteResponse.coverUrl === 'string' ? noteResponse.coverUrl : null;
      console.log('Loading cover from database:', coverUrlValue, 'Full response:', noteResponse);
      setCoverUrl(coverUrlValue);
      setIsPublicNote(noteResponse.isPublicNote || false);
      setParentId(noteResponse.parentId || null);
      setIsRestrictedPage(Boolean(noteResponse.isRestrictedPage));
      setNoteType(noteResponse.noteType as string);
      setSharedWith(noteResponse.sharedWith || []);
      setIsCurrentNoitePublic(noteResponse.isPublicNote || false);
      setNoteOwnerUserId(noteResponse.userId?.toString() ?? "");
      setWorkspaceId(typeof noteResponse.workspaceId === 'string' ? noteResponse.workspaceId : "default");
      
      // Clear any cached 404 errors for this note
      window.localStorage.removeItem(`404-error-${editorKey}`);

      // Set content if available
      if (noteResponse.content) {
        try {
          const content = noteResponse.content;
          const parsedContent = typeof content === "string" ? JSON.parse(content) : content;
          const onlineContent = parsedContent.online_content;

          // Validate and set content
          if (onlineContent?.type === "doc") {
            setInitialContent(onlineContent);
            prevContentRef.current = onlineContent;
      
            // Cache content and ALL metadata (preserving your original caching)
            window.localStorage.setItem(`novel-content-${editorKey}`, JSON.stringify(onlineContent));
            window.localStorage.setItem(
              `last_content_update_time-${editorKey}`,
              JSON.stringify(noteResponse.updatedAt),
            );
            window.localStorage.setItem(`content-loaded-${editorKey}`, "true");
          } else {
            setInitialContent(defaultEditorContent);
          }
        } catch (e) {
          setInitialContent(defaultEditorContent);
        }
      } else {
        setInitialContent(defaultEditorContent);
      }

      // Check for shared status
      if (noteResponse.sharedWith) {
        const userString = window.localStorage.getItem("auth_user");
        const user = userString ? JSON.parse(userString) : null;
        const email = user?.email;

        const sharedEntry = noteResponse.sharedWith.find(
          (entry: { email: string; access: string }) => entry.email === email,
        );
        if (sharedEntry) setIsSharedNote(true);

        // Check write access
        const userId = user?.id;
        const hasWriteAccess = checkUserWriteAccess(noteResponse, userId, email);

        if (!hasWriteAccess) {
          setReadOnly(true);
          window.localStorage.setItem(`readOnly-${editorKey}`, "true");
        } else {
          setReadOnly(false);
          window.localStorage.setItem(`readOnly-${editorKey}`, "false");
        }
      } else {
        // No shared data, assume user has write access for new notes
        setReadOnly(false);
        window.localStorage.setItem(`readOnly-${editorKey}`, "false");
      }

      // if(initialSyncDone === true ) {
      //   setIsLoading(false)
      // };
    } else if (!isNoteLoading && !isNoteError) {
      // Handle case where there's no data but no error either (new note or loading state)
      const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
      const isOptimisticNote = optimisticIds.includes(editorKey);
      
      if (isOptimisticNote) {
        console.log("Setting up new optimistic note");
        setInitialContent(defaultEditorContent);
        setReadOnly(false);
        setIsLoading(false);
        
        // Set default title for new notes and clear any cached pending title
        setEditorTitle("Untitled");
        setDocumentTitle("Untitled");
        setTitleIcon("");
        setNoteType("original");
        setPendingTitle("");
        localStorage.removeItem(`pending-title-${editorKey}`);
      } else {
        // For non-optimistic notes without data, set default content to prevent infinite loading
        console.log("No data available, setting default content");
        setInitialContent(defaultEditorContent);
        setReadOnly(false);
        setIsLoading(false);
        
        // Set default title for new notes and clear any cached pending title
        setEditorTitle("Untitled");
        setDocumentTitle("Untitled");
        setTitleIcon("");
        setNoteType("original");
        setPendingTitle("");
        localStorage.removeItem(`pending-title-${editorKey}`);
      }
    }
  }, [noteQueryData, isNoteLoading, isNoteError, noteError, editorKey]);

  useEffect(() => {
    // Skip invalid editorKey values to prevent unnecessary API calls
    if (!editorKey || editorKey === "notes" || editorKey === "undefined") {
      setInitialContent(defaultEditorContent);
      setTimeout(() => setIsLoading(false), 300);
      return;
    }

    // For review/published pages, completely skip this useEffect
    if (noteQueryData && (noteQueryData.noteType === 'review' || noteQueryData.noteType === 'approved')) {
      console.log("Review/published page - completely skipping localStorage useEffect");
      return;
    }
    
    // If we don't have noteQueryData yet, wait for it
    if (!noteQueryData) {
      return;
    }

    // Check for optimistic notes, but don't return early
    // This allows title updates to work while still using local content
    const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
    const isOptimisticNote = optimisticIds.includes(editorKey);

    if (isOptimisticNote) {
      console.log("Using local content for optimistic note, but allowing API calls for metadata");

      try {
        const local = window.localStorage.getItem(`novel-content-${editorKey}`);
        if (local) {
          const parsed = JSON.parse(local);
          setInitialContent(parsed);
          setReadOnly(false);
          prevContentRef.current = parsed;

          // Mark content as loaded to prevent unnecessary API calls for content
          window.localStorage.setItem(`content-loaded-${editorKey}`, "true");
          setIsLoading(false);

          // But still allow API calls for metadata (like title updates)
          // by continuing with the rest of the function
        } else {
          setInitialContent(defaultEditorContent);
          setReadOnly(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load optimistic content", err);
        setInitialContent(defaultEditorContent);
        setReadOnly(false);
        setIsLoading(false);
      }

      return;
    }

    isDirtyRef.current = false;

    setIsLoading(true);
    setAccessError(null);
    setNotFoundError(null);
    setGenericError(null);

    // Check if we have a very recent API call (within last 2 seconds)
    // This helps prevent multiple calls during page refresh
    const lastApiCheck = JSON.parse(window.localStorage.getItem(`last-api-check-${editorKey}`) || "0");
    const THROTTLE_DURATION = 1000; // 1 second - reduced to make it less aggressive

    // Only apply throttling if we already have content loaded
    const hasLoadedContent = window.localStorage.getItem(`content-loaded-${editorKey}`);

    if (Date.now() - lastApiCheck < THROTTLE_DURATION && hasLoadedContent) {
      console.log("Throttling API call - using cached data");
      try {
        const raw = window.localStorage.getItem(`novel-content-${editorKey}`);
        if (raw && raw !== "undefined" && raw !== "null") {
          const offline_content = JSON.parse(raw);
          setInitialContent(offline_content || undefined);
          prevContentRef.current = offline_content;

          // if(initialSyncDone === true ) {
          //   setIsLoading(false)
          // };
          return;
        }
      } catch (e) {
        console.error("Error parsing cached content:", e);
      }
    }

    // Store current timestamp for throttling
    window.localStorage.setItem(`last-api-check-${editorKey}`, JSON.stringify(Date.now()));

    let offline_content = null;
    try {
      const raw = window.localStorage.getItem(`novel-content-${editorKey}`);
      if (raw && raw !== "undefined" && raw !== "null") {
        offline_content = JSON.parse(raw);
        prevContentRef.current = offline_content;
      }
    } catch (e) {
      console.error("Invalid JSON in localStorage for", editorKey, e);
      offline_content = null;
    }

    let lastUpdateTimeOfflineRaw = window.localStorage.getItem(`last_content_update_time-${editorKey}`);
    if (!lastUpdateTimeOfflineRaw || lastUpdateTimeOfflineRaw === "undefined" || lastUpdateTimeOfflineRaw === "null") {
      lastUpdateTimeOfflineRaw = null;
    }
    const lastUpadteTimeOffline = lastUpdateTimeOfflineRaw ? JSON.parse(lastUpdateTimeOfflineRaw) : null;

    //check for content in local storage and getALLContent
    if (!offline_content || offline_content === undefined) {
      console.log("No local content - checking if this is a new note");
      
      // Check if this might be a new note that doesn't exist yet
      const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
      const isOptimisticNote = optimisticIds.includes(editorKey);
      
      // Also check if this is a recently created note (within last 30 seconds)
      const recentlyCreated = Date.now() - parseInt(localStorage.getItem(`note-created-${editorKey}`) || "0") < 30000;
      
      if (isOptimisticNote || recentlyCreated) {
        console.log("New note detected in localStorage check, setting default content");
        setInitialContent(defaultEditorContent);
        setReadOnly(false);
        setIsLoading(false);
        
        // Set default title for new notes and clear any cached pending title
        setEditorTitle("Untitled");
        setDocumentTitle("Untitled");
        setTitleIcon("");
        setNoteType("original");
        setPendingTitle("");
        localStorage.removeItem(`pending-title-${editorKey}`);
        
        return;
      }
      
      console.log("Fetching from server with React Query");
      // React Query will handle this via the useEffect that watches noteQueryData
      return;
    }

    //call the api if the content is present locally for getting last updated time of content
    getWithAuth<NoteResponse>(`/api/note/getNote/${editorKey}`, {
      headers: {
        "include-content": "false",
        "content-path": "",
      },
    })
      .then((response) => {
        // Check if response is an error
        if ("isError" in response && response.isError) {
          if (response.status === 404) {
            // Cache the 404 error to prevent future API calls
            window.localStorage.setItem(`404-error-${editorKey}`, "true");
            window.localStorage.removeItem(`readOnly-${editorKey}`); // Clear cached access state
            setNotFoundError({
              noteId: editorKey,
              message: response.message || "Note not found",
            });
          } else if (response.status === 403) {
            window.localStorage.removeItem(`readOnly-${editorKey}`); // Clear cached access state
            setAccessError({
              message: response.message || "Access denied",
              status: 403,
              error: "NOT_AUTHORIZED",
              noteId: editorKey,
              noteTitle: undefined,
            });
          } else {
            // Handle other errors (500, network errors, etc.)
            window.localStorage.removeItem(`readOnly-${editorKey}`); // Clear cached access state
            setGenericError({
              status: response.status || 500,
              message: response.message || "An error occurred",
              noteId: editorKey,
            });
          }
          return;
        }

        const noteResponseForTime = response as NoteResponse;
        const lastUpdateTimeOnline = noteResponseForTime?.updatedAt;
        const commitSha = noteResponseForTime?.commitsha as string;
        const commitPath = noteResponseForTime.commitPath as string;

        // Empty the invites for this note
        setInvites([]);

        if (lastUpadteTimeOffline < lastUpdateTimeOnline) {
          console.log("Content outdated - fetching latest from server with React Query");
          // Use React Query to refetch with content included
          refetchNote();
          return;
        }
        

        console.log("Using cached content - no changes detected");
        setInitialContent(offline_content || undefined);
        // Mark content as loaded
        window.localStorage.setItem(`content-loaded-${editorKey}`, "true");

        // Type guard to ensure we have a valid NoteResponse
        const noteResponse = response as NoteResponse;
        const approvalStatus = noteResponse?.approvalStatus;
        const isPublished = noteResponse?.isPublish;
        const noteUserEmail = noteResponse?.userEmail as string;
        const title = noteResponse?.title;
        const icon = noteResponse?.icon as string;
        const is_publicNote = noteResponse?.isPublicNote as boolean;
        const parentId = noteResponse?.parentId || null;
        const isRestrictedPage = noteResponse?.isRestrictedPage;
        const noteType = noteResponse?.noteType as string;
        const coverUrl = noteResponse?.coverUrl as string;
        setNoteOwnerMail(noteUserEmail);
        setPublishStatus(approvalStatus);
        setApprovalStatus(approvalStatus);
        setGithubRawUrl(noteResponse.githubRawUrl);
        setIsPublish(isPublished);
        setEditorTitle(title);
        setDocumentTitle(title);
        setTitleIcon(icon);
        setCoverUrl(coverUrl === '' ? "" : coverUrl);
        setIsPublicNote(is_publicNote);
        setIsCurrentNoitePublic(is_publicNote)
        setParentId(parentId);
        setIsRestrictedPage(isRestrictedPage as boolean);
        setNoteType(noteType);
        setNoteOwnerUserId(noteResponse.userId?.toString() ?? "");
        setWorkspaceId(typeof noteResponse.workspaceId === 'string' ? noteResponse.workspaceId : "default");

        // Get user info first to check access for all notes (including those without content)
        const userString = window.localStorage.getItem("auth_user");
        const user = userString ? JSON.parse(userString) : null;
        const email = user?.email;
        const userId = user?.id;

        if (noteResponse?.sharedWith) {
          const sharedEntry = noteResponse.sharedWith.find(
            (entry: { email: string; access: string }) => entry.email === email,
          );
          if (sharedEntry) setIsSharedNote(true);
        }

        // Check if user has write access to this note (regardless of content)
        const hasWriteAccess = checkUserWriteAccess(noteResponse, userId, email);

        if (!hasWriteAccess) {
          setReadOnly(true);
          window.localStorage.setItem(`readOnly-${editorKey}`, "true");
        } else {
          setReadOnly(false);
          window.localStorage.setItem(`readOnly-${editorKey}`, "false");
        }

        // set the editor content in useRef
        if (prevEditorKey.current !== editorKey) {
          prevContentRef.current = offline_content;
        }

        prevEditorKey.current = editorKey;

        // if(initialSyncDone === true ) {
        //   setIsLoading(false)
        // };        
        return;
      })
      .catch((error) => {
        setIsLoading(false);
        console.error("Error in fetching Last Upadted Online time ", error);
      });

    // Cleanup function
    return () => {
      // React Query handles request cancellation
      // Clear cached readOnly state when editorKey changes to prevent stale cache
      window.localStorage.removeItem(`readOnly-${editorKey}`);
    };
  }, [editorKey]);

  // Effect to handle share modal


  useEffect(() => {
    const pendingTitleObj = localStorage.getItem(`pending-title-${editorKey}`);
    if (pendingTitleObj) {
      try {
        const parsed = JSON.parse(pendingTitleObj);
        setPendingTitle(parsed.newTitle || "");
      } catch {
        setPendingTitle("");
      }
    } else {
      setPendingTitle("");
    }
  }, [editorKey]);

  useEffect(() => {
    setShowModal(false);  
    setInvites([]);
    try {
      const rootNodesRaw = localStorage.getItem("rootNodes");
      if (rootNodesRaw) {
        const rootNodes = JSON.parse(rootNodesRaw);
        setRootNodes(rootNodes);
      }
    } catch (localErr) {
      console.error("Failed to update localStorage title on blur:", localErr);
    }
}, []);

  // Update editor's editable state when readOnly changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setEditable(!readOnly);
    }
  }, [readOnly]);

  useEffect(() => {
    function handleResize() {
      if (aiSelectorOpen && isSlashCommandAIOpen && editorRef.current) {
        // recalculate position
        const selection = editorRef.current.view.state.selection;
        const coords = editorRef.current.view.coordsAtPos(selection.from);
        const editorContainer = editorRef.current.options.element;
        const editorRect = editorContainer.getBoundingClientRect();
        let left = coords.left - editorRect.left + 10;
        const top = coords.bottom - editorRect.top + 200;
        const aiSelectorWidth = Math.min(400, window.innerWidth * 0.9);
        const maxLeft = Math.min(editorRect.width, window.innerWidth) - aiSelectorWidth - 20;
        if (left > maxLeft) left = maxLeft;
        if (left < 10) left = 10;
        setAISelectorPosition({ left, top });
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [aiSelectorOpen, isSlashCommandAIOpen]);

  // If there's a not found error, show the not found page
  if (notFoundError) {
    return <NotFoundPage noteId={notFoundError.noteId} message={notFoundError.message} />;
  }

  // If there's a generic error, show the error page
  if (genericError) {
    return (
      <ErrorPage
        errorCode={genericError.status}
        message={genericError.message}
        errorId={genericError.noteId}
        showRetry={true}
        onRetry={() => {
          setGenericError(null);
          window.location.reload();
        }}
      />
    );
  }

  // If there's an access error, show the no access message
  if (accessError) {
    return (
      <NoAccessMessage noteId={accessError.noteId} noteTitle={accessError.noteTitle} message={accessError.message} />
    );
  }

  if (!initialContent) {
    return (
      <div className="relative w-full p-12 pt-0">
        {isLoading && ( <EditorLoading/> )}
      </div>
    );
  }

  return (
    <div className="relative w-full p-12 pt-0 sm:p-0 ">
        <div className="flex justify-start gap-2 pl-12 mt-8 p-4 pt-0 max-w-screen-lg">
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[#5F5E5B] dark:text-[#9B9B9B]">
                <span>{saveStatus}</span>
            </div>    
        
      </div>
      
            <CoverImage
              coverUrl={coverUrl}
              onCoverChange={handleCoverChange}
              onCoverRemove={handleCoverRemove}
              onUploadCover={handleUploadCover}
              workspaceId={workspaceId}
              openPicker={showCoverPicker}
              onPickerClose={() => setShowCoverPicker(false)}
            />
      
      <EditorHeader
        titleIcon={titleIcon}
        setEditing={setEditing}
        selectedNoteId={selectedNoteId as string}
        editorKey={editorKey}
        activeEmoji={activeEmoji}
        editing={editing}
        readOnly={readOnly}
        inputRef={inputRef}
        noteType={noteType}
        noteOwnerMail={noteOwnerMail}
        parentId={parentId}
        user={user}
        showCommitHistory={false}
        setChildrenNotes={setChildrenNotes}
        rootNodes={rootNodes}
        setNotes={setNotes}
        updateTitleDeep={updateTitleDeep}
        editorTitle={editorTitle}
        activeTitle={activeTitle}
        pendingTitle={pendingTitle}
        isTitleDirtyRef={isTitleDirtyRef}
        pendingTitleMap={pendingTitleMap}
        updateNoteWithQuery={updateNoteWithQuery}
        updateNodeInCache={updateNodeInCache}
        queryClient={queryClient}
        toast={toast}
        isOwner={isOwner}
        coverUrl={coverUrl}
        onAddCover={handleAddCover}
      />


      <div className="flex-1 w-full pt-2">
        <EditorRoot>
          <EditorContent
            key={`editor-${editorKey}`}
            // contenteditable={!readOnly}
            initialContent={ noteType === 'original' ?  undefined : initialContent}
            extensions={extensions}
            onCreate={({ editor }) => {
              editorRef.current = editor;
              editor.setEditable(!readOnly );
              setEditorInstance(editor);
            }}
            className="w-full h-full  bg-background dark:bg-background  p-4"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => handleCommandNavigation(event),
              },
              handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
              handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
              attributes: {
                class:
                  "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full ",
              },
            }}
            onUpdate={({ editor }) => {
              if (!readOnly) {
                debouncedUpdates(editor);
                debouncedUpdatesOnline(editor);
                setSaveStatus("Unsaved");
              }
            }}
            slotAfter={<ImageResizer />}
          >
            {aiSelectorOpen && aiSelectorPosition && isSlashCommandAIOpen && (
              <div
                className="rounded-md border bg-background dark:bg-background"
                style={{
                  position: "absolute",
                  left: aiSelectorPosition.left,
                  top: aiSelectorPosition.top,
                  zIndex: 9999,
                }}
              >
                <AISelector
                  open={aiSelectorOpen}
                  onOpenChange={(open) => {
                    setAISelectorOpen(open);
                    setIsSlashCommandAIOpen(open);
                    if (!open) {
                      setAISelectorPosition(null);
                    }
                  }}
                />
              </div>
            )}

            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted  bg-background dark:bg-background  px-1 py-2 shadow-md transition-all">
              <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item) => {
                  if (item.title === "Ask AI" && !isPremiumUser) {
                    return null;
                  }
                  
                  return (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background dark:bg-background">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </EditorCommandItem>
                  );
                })}
              </EditorCommandList>
            </EditorCommand>

            <GenerativeMenuSwitch
              open={openAI}
              onOpenChange={(open) => {
                setOpenAI(open);
                if (open && isSlashCommandAIOpen) {
                  // Close slash command AI when generative menu opens
                  setAISelectorOpen(false);
                  setIsSlashCommandAIOpen(false);
                  setAISelectorPosition(null);
                }
              }}
            >
              <Separator orientation="vertical" />
              <NodeSelector open={openNode} onOpenChange={setOpenNode} />
              <Separator orientation="vertical" />
              <LinkSelector open={openLink} onOpenChange={setOpenLink} />
              <Separator orientation="vertical" />
              <MathSelector />
              <Separator orientation="vertical" />
              <TextButtons />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            </GenerativeMenuSwitch>
          </EditorContent>
        </EditorRoot>
        {editorRef.current && <TableToolbar editor={editorRef.current} />}
      </div>
      {modal}
      <EmbedModalWrapper />

      </div>
  );
};

export default TailwindNewEditor;
