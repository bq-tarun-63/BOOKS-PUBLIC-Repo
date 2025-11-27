"use client";
import { NoAccessMessage } from "@/components/ui/no-access";
import { useShare } from "@/contexts/ShareContext";
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
import type { publishResponse } from "@/lib/api-helpers";
import type { publishState } from "@/lib/api-helpers";
import { defaultEditorContent } from "@/lib/content";
import { useQueryClient } from "@tanstack/react-query";
import { Clock1, FileText, Loader2, Lock, Paperclip, Trash2, X } from "lucide-react";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { ErrorPage } from "./ErrorPage";
import { NotFoundPage } from "./NotFoundPage";
import { defaultExtensions } from "./extensions";
import { uploadFn, uploadCoverImage } from "./image-upload";
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
import { CommentSelector } from "./selectors/comment-selector";

import type { Editor } from "@tiptap/core";

// At the top of your component file
import type { AdvancedEditorProps, ApiError, Invite, NoteResponse, PendingTitle } from "@/types/advance-editor";
import type { ApiErrorResponse } from "@/lib/api-helpers";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";
import { AISelector } from "./generative/ai-selector";
import { Separator } from "./ui/separator";
import DeleteConfirmationModal from "./ui/deleteConfirmationModal";
import ShareModal from "./ui/shareModel";
import { CommitSlider } from "./ui/CommitSlider"; 
import { commitManager } from "@/services-frontend/commitHistory/commitHistory";
import HistoryEditor from "./HistoryEditor";
import { useNotifications } from "@/hooks/use-notifications";
import { isEditorContentEmpty, isPublishResponse } from "@/services-frontend/editor/editorService";
import EditorHeader from "./editor/editorHeader";
import EditorLoading from "./editor/editorLoading";
import CoverImage from "./editor/CoverImage";
import CopyLinkButton from "./editor/buttons/copyLink";
import DeleteButton from "./editor/buttons/deleteButton";
import CommentPanel from "./comment/commentPanel";
import CommentBox from "./comment/commentBox";
import { extractCommentIds } from "@/services-frontend/note/inlineCommentService" 
import { useCommentPanel } from "@/contexts/inlineCommentContext";
import { useActivityLogs } from "@/hooks/useActivityLog";
import ActivityLogContainer from "@/components/tailwind/activity/activityLogContainer";
import { version } from "os";
import { EmbedModalWrapper } from "./ui/embed-modal-wrapper";



const hljs = require("highlight.js");


const TailwindAdvancedEditor = ({ editorKey, shareNoteId, onShareComplete }: AdvancedEditorProps) => {
  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<"Saving..." | "Saved" | "Save Failed" | "Saved Online" | "Unsaved">(
    "Saved",
  );

  const [openNode, setOpenNode] = useState<boolean>(false);
  const [openColor, setOpenColor] = useState<boolean>(false);
  const [openLink, setOpenLink] = useState<boolean>(false);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [openComment, setOpenComment] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
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
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPermission, setNewPermission] = useState<"read" | "write">("read");
  const [invites, setInvites] = useState<Invite[]>([{ email: "", permission: "read" }]);
  const [generalAccess, setGeneralAccess] = useState<string>("restricted");
  const [copied, setCopied] = useState<boolean>(false);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  const { setShareNoteId, removeSharedPage } = useShare();
  const [publishLoading, setPublishLoading] = useState<boolean>(false);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [approvalDirection, setApprovalDirection] = useState<"approve" | "reject" | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("");
  const [githubRawUrl, setGithubRawUrl] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<publishState>();
  const [isPublish, setIsPublish] = useState<boolean>();
  const [noteOwnerMail, setNoteOwnerMail] = useState<string>("");
  const [noteOwnerUserId, setNoteOwnerUserId] = useState<string>("");
  // const [editorTitle, setEditorTitle] = useState<string>("Untitled");
  const [titleIcon, setTitleIcon] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const prevContentRef = useRef<any>(null);
  const prevEditorKey = useRef(editorKey);
  const [isPublicNote, setIsPublicNote] = useState<boolean>(false);
  const [noteType, setNoteType] = useState<string>("original");
  const { UpdateNote, DeleteNote } = useNoteActions();
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
  const handleAddCover = async () => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      return;
    }
    try {
      // Fetch available covers from API
      const response = await postWithAuth(`/api/covers/create`, {
        id: editorKey,
      });

      if (response && typeof response === "object" && "isError" in response) {
        const errorResponse = response as ApiErrorResponse;
        toast.error(errorResponse.message || "Failed to add cover");
        return;
      }

      const coverResponse = response as { url?: string };

      if (coverResponse.url) {
        // Pick a random cover
        // const randomCover = data.images[Math.floor(Math.random() * data.length)];
        setCoverUrl(coverResponse.url);
        updateNodeInCache(editorKey, editorTitle, titleIcon, coverResponse.url);
        toast.success("Cover added successfully!");
      } else {
        toast.error("No cover images available");
      }
    } catch (error) {
      console.error("Failed to load covers:", error);
      toast.error("Failed to add cover");
    }
    // Note: Cover persistence to database can be added when backend is ready
  };

  const handleCoverChange = async (newCover: string) => {
    if (readOnly) {
      toast.error("You don't have permission to edit this page.");
      return;
    }
    
    //save the current cover url for rollback in the case of api failure 
    const prevCoverUrl = coverUrl;
    setCoverUrl(newCover);
    // Persist to database
    try {
      const res = await postWithAuth(`/api/covers/update`, {
        id: editorKey,
        coverUrl: newCover,
      });

      if (res && typeof res === "object" && "isError" in res) {
        const errorResponse = res as ApiErrorResponse;
        toast.error(errorResponse.message || "Failed to update cover");
        setCoverUrl(prevCoverUrl);
        return;
      }

      const coverResponse = res as { url?: string };

      if (coverResponse.url) {
        setCoverUrl(coverResponse.url);
        updateNodeInCache(editorKey, editorTitle, titleIcon, coverResponse.url);
        toast.success("Cover updated successfully!");
      } else {
        toast.error("Failed to update cover");
        setCoverUrl(prevCoverUrl);
      }
    } catch (error) {
      console.error("Error updating cover:", error);
      toast.error("Failed to update cover");
      setCoverUrl(prevCoverUrl);
    }
  };

  const handleCoverRemove = async () => {
      //save the current cover url for rollback in the case of api failure 
      const prevCoverUrl = coverUrl;
      setCoverUrl("");
      // Persist to database
      try {
        const res = await postWithAuth(`/api/covers/update`,{
          id: editorKey, 
          coverUrl: "",
        })
        if (res.url == "") {
          toast.success("Cover updated successfully!");
        } else {
          toast.error("Failed to update cover");
          setCoverUrl(prevCoverUrl);
        }
      } catch (error) {
        console.error("Error updating cover:", error);
        toast.error("Failed to update cover");
        setCoverUrl(prevCoverUrl);
      }
  };

  const handleUploadCover = async (file: File): Promise<string> => {
    const url = await uploadCoverImage(file, { noteId: editorKey, parentId: parentId || undefined });
    return url;
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

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removingNoteId, setRemovingNoteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Stable callback to avoid flushSync issues
  const handleSetLeader = useCallback((isLeader: boolean) => {
    setIsLeader(isLeader);
  }, []);

  const { socketConnected , initialSyncDone} = useCollaborativeEditor({ 
    editor: editorRef.current,
    editorKey,
    mode: isPublicNote ? true : false || isSharedNote,
    onSetLeader: handleSetLeader,
    isRestrictedPage: isRestrictedPage as boolean,
    noteType,
  });


const [showCommitHistory, setShowCommitHistory] = useState<boolean>(false);
const [commitHistoryLoading, setCommitHistoryLoading] = useState<boolean>(false);
const [commits, setCommits] = useState<any[]>([]);
const [selectedCommit, setSelectedCommit] = useState<any>(null);
const [historyEditorContent, setHistoryEditorContent] = useState<any>(null);
const [isHistoryMode, setIsHistoryMode] = useState<boolean>(false);
const [commitContentLoading, setCommitContentLoading] = useState<boolean>(false);
const [isApplyingCommit, setIsApplyingCommit] = useState<boolean>(false);
const historyEditorRef = useRef<any>(null);
const { mentionUser } = useNotifications();
const { fetchCommentsBatch } = useCommentPanel();
const [showLogs, setShowLogs] = useState(false);
const { activityLogs, isLogLoading} = useActivityLogs(showLogs ? editorKey : null);



const fetchCommitHistory = async () => {
  if (!editorKey || !editorRef.current) return;

  commitManager.storeOriginalContent(editorRef.current.getJSON());

  setCommitHistoryLoading(true);

  try {
    // Force save any unsaved changes before showing history
    if (editorRef.current) {
      // Call the upload content API directly to ensure content is saved
      const json = editorRef.current.getJSON();
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
        
        if (!("isError" in response && response.isError)) {
          console.log("Content saved before showing history");
          setSaveStatus("Saved Online");
        }
      } catch (error) {
        console.error("Error saving content before history:", error);
      }
    }
    
    const historyPromise = commitManager.fetchCommitHistory(editorKey);
    const fetchedCommits = await historyPromise;
    const combinedCommits = fetchedCommits.map((c: any) => ({
      sha: c.sha,
      time: c.date, 
      version: c.version
    }));


    if (combinedCommits) {
      setIsHistoryMode(true);
      setShowCommitHistory(true);
      setCommitHistoryLoading(false);
      setCommits(combinedCommits);
      if (combinedCommits.length > 0) {
        setSelectedCommit(combinedCommits[0]);
        const firstCommitContent = await commitManager.loadCommitContent(editorKey, combinedCommits[0].sha,   combinedCommits[0].version);
        if (firstCommitContent) {
          setHistoryEditorContent(firstCommitContent);
        }
      }
    }
  } catch (error) {
    console.error("Error in fetchCommitHistory:", error);
  } finally {
    setCommitHistoryLoading(false);
  }
};

const loadCommitContent = useDebouncedCallback(async (commitSha: string, version: string) => {
  if (!editorKey || !editorRef.current) return;

  if (isHistoryMode) {
    const content = await commitManager.loadCommitContent(editorKey, commitSha, version);
    if (content) {
      setHistoryEditorContent(content);
    }
    setCommitContentLoading(false);
    return;
  }
}, 300);

// Direct function to load commit content without debouncing (for apply functionality)
const loadCommitContentDirect = async (commitSha: string, version: string) => {
  if (!editorKey) return null;
  
  try {
    const content = await commitManager.loadCommitContent(editorKey, commitSha, version);
    return content;
  } catch (error) {
    console.error("Error loading commit content:", error);
    return null;
  }
};

// Force save online without socket dependency (for apply functionality)
const forceSaveOnline = async (editor: Editor) => {
  if (showCommitHistory || isHistoryMode) return; 
  if (noteType !== 'original') return;
  
  const json = editor.getJSON();
  
  // Check if the content has changed
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
    
    console.log("Force save completed successfully");
    return response;
  } catch (error) {
    console.error("Network error saving content online:", error);
    setSaveStatus("Save Failed");
  }
};

const closeCommitHistory = () => {
  setShowCommitHistory(false);
  setIsHistoryMode(false);
    
  // Restore original content
  if (editorRef.current) {
    const originalContent = commitManager.getOriginalContent();
    if (originalContent) {
      editorRef.current.commands.setContent(originalContent, false);
    }
  }
  commitManager.clearOriginalContent();
};

const applyCommitContent = async (commit: any) => {
  if (!editorRef.current || !editorKey) return;
  
  console.log("=== APPLY COMMIT DEBUG ===");
  console.log("Commit to apply:", commit);
  console.log("Selected commit:", selectedCommit);
  console.log("History editor content:", historyEditorContent);
  console.log("Current editor content before apply:", editorRef.current.getJSON());
  console.log("Editor is editable:", editorRef.current.isEditable);
  console.log("Read only state:", readOnly);
  console.log("Show commit history:", showCommitHistory);
  console.log("Is history mode:", isHistoryMode);
  
  setIsApplyingCommit(true);
  
    // Temporarily disable collaborative editor to prevent content override
    const originalSocketConnected = socketConnected;
    if (socketConnected) {
      console.log("Temporarily disabling collaborative editor sync");
      setSocketConnected(false);
      
      // Clear any offline backup to prevent restoration
      if (editorRef.current && editorRef.current.storage?.collaborativeEditor) {
        try {
          const yDoc = editorRef.current.storage.collaborativeEditor.doc;
          if (yDoc) {
            // Clear the offline backup
            yDoc.getXmlFragment('prosemirror').delete(0, yDoc.getXmlFragment('prosemirror').length);
            console.log("Cleared collaborative editor offline backup");
          }
        } catch (error) {
          console.error("Error clearing collaborative editor backup:", error);
        }
      }
    }
  
  try {
    let contentToApply = null;
    
    // First, try to use the already loaded content from history editor if it matches
    if (selectedCommit && selectedCommit.sha === commit.sha && historyEditorContent) {
      console.log("Using already loaded content from history editor");
      contentToApply = historyEditorContent;
    } else {
      // Load the commit content using the direct function
      console.log("Loading fresh content for commit:", commit.sha);
      contentToApply = await loadCommitContentDirect(commit.sha, commit.version);
      console.log("Fresh content loaded:", contentToApply);
    }
    
    if (!contentToApply) {
      console.error("No content to apply");
      toast.error("Failed to load commit content");
      return;
    }
    
    console.log("Content to apply:", contentToApply);
    console.log("Content to apply type:", typeof contentToApply);
    console.log("Content to apply keys:", contentToApply ? Object.keys(contentToApply) : "No keys");
    
    // Check if content is different from current
    const currentContent = editorRef.current.getJSON();
    console.log("Current content:", currentContent);
    console.log("Are contents different?", JSON.stringify(currentContent) !== JSON.stringify(contentToApply));
    
    // Apply the content to the main editor
    console.log("Setting content in editor...");
    
    // Temporarily make editor editable if it's not
    const wasEditable = editorRef.current.isEditable;
    if (!wasEditable) {
      console.log("Making editor editable temporarily");
      editorRef.current.setEditable(true);
    }
    
    // Use replaceWith to completely replace the document content
    console.log("Replacing document content...");
    try {
      const editorState = editorRef.current.state;
      const docSize = editorState.doc.content.size;
      
      // Create a transaction that replaces all content
      const tr = editorState.tr.replaceWith(0, docSize, 
        editorRef.current.schema.nodeFromJSON(contentToApply).content);
      
      editorRef.current.view.dispatch(tr);
      console.log("Document content replaced successfully");
    } catch (error) {
      console.error("ReplaceWith failed, trying setContent:", error);
      // Fallback to setContent
      editorRef.current.commands.setContent(contentToApply, false);
    }
    
    // Restore editable state
    if (!wasEditable) {
      console.log("Restoring editor editable state");
      editorRef.current.setEditable(wasEditable);
    }
    
    // Force update the editor
    editorRef.current.commands.focus();
    
    // Wait a bit for the content to be applied
    setTimeout(() => {
      console.log("Editor content after apply:", editorRef.current.getJSON());
      console.log("Editor HTML after apply:", editorRef.current.getHTML());
      
      // Check if content was actually applied
      const finalContent = editorRef.current.getJSON();
      const wasApplied = JSON.stringify(finalContent) === JSON.stringify(contentToApply);
      console.log("Content was successfully applied:", wasApplied);
      
      if (!wasApplied) {
        console.log("Content was not applied correctly. Trying alternative approach...");
        // Try to force update by clearing and setting again
        editorRef.current.commands.clearContent();
        setTimeout(() => {
          editorRef.current.commands.setContent(contentToApply, true);
          console.log("Retry - Editor content after retry:", editorRef.current.getJSON());
        }, 100);
      }
    }, 300);
    
    // Update the content reference
    prevContentRef.current = contentToApply;
    
    // Mark as dirty to trigger save
    isDirtyRef.current = true;
    setIsContentSynced(false);
    setSaveStatus("Unsaved");
    
    // Force update the collaborative editor with the new content
    if (editorRef.current && editorRef.current.storage?.collaborativeEditor) {
      console.log("Updating collaborative editor with applied content...");
      try {
        // Get the current Y.Doc and update it with the new content
        const yDoc = editorRef.current.storage.collaborativeEditor.doc;
        if (yDoc) {
          // Clear the current content and set the new content
          const yXmlFragment = yDoc.getXmlFragment('prosemirror');
          yXmlFragment.delete(0, yXmlFragment.length);
          
          // Convert the content to Y.Doc format and insert it
          const newContent = editorRef.current.schema.nodeFromJSON(contentToApply);
          const yXmlContent = yXmlFragment.createText(newContent.textContent || '');
          yXmlFragment.insert(0, [yXmlContent]);
          
          console.log("Collaborative editor updated with new content");
        }
      } catch (error) {
        console.error("Error updating collaborative editor:", error);
      }
    }
    
    // Force a complete editor refresh to ensure content is properly applied
    setTimeout(() => {
      if (editorRef.current) {
        console.log("Forcing editor refresh after content application...");
        // Force the editor to re-render with the new content
        editorRef.current.commands.setContent(contentToApply, true);
        editorRef.current.commands.focus();
        console.log("Editor refresh completed");
      }
    }, 100);
    
    // Immediately trigger save after content is applied
    console.log("Immediately triggering save after content application...");
    setSaveStatus("Saving...");
    if (editorRef.current) {
      forceSaveOnline(editorRef.current);
    }
    
    // Force trigger the online save after applying content
    setTimeout(async () => {
      if (editorRef.current) {
        console.log("Triggering online save after apply...");
        // Force save without socket dependency
        await forceSaveOnline(editorRef.current);
        console.log("Online save completed after apply");
      }
    }, 500);
    
    // Close the history view
    closeCommitHistory();
    
    // Show success message
    toast.success("Commit content applied successfully");
  } catch (error) {
    console.error("Error applying commit content:", error);
    toast.error("Failed to apply commit content");
  } finally {
    // Re-enable collaborative editor sync after a delay
    if (originalSocketConnected) {
      console.log("Re-enabling collaborative editor sync");
      setTimeout(() => {
        setSocketConnected(true);
        // Trigger another save after re-enabling collaborative editor
        if (editorRef.current) {
          console.log("Triggering save after re-enabling collaborative editor...");
          setTimeout(async () => {
            await forceSaveOnline(editorRef.current);
            console.log("Final save completed after re-enabling collaborative editor");
          }, 1000);
        }
      }, 5000); // Wait 5 seconds to ensure content is fully applied and stable
    }
    setIsApplyingCommit(false);
  }
};

useEffect(() => {
  return () => {
    closeCommitHistory();
    commitManager.clearOriginalContent();
  };
}, [editorKey]);

  useEffect(() => {
    if(showCommitHistory) return;
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
    () => getSuggestionItems(editorKey, promptForPageTitle, handlePageCreated, openAISelectorAtSelection , fetchCommitHistory),
    [editorKey, promptForPageTitle],
  );
  const slashCommand = useMemo(() => getSlashCommand(editorKey, promptForPageTitle, fetchCommitHistory), [editorKey, promptForPageTitle]);

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
    if (showCommitHistory || isHistoryMode) return; 
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

  const handleInvite = async (editorKey: string, sharedWith: Invite[], isPublic: string) => {
    
    const response = await inviteToNote(editorKey, sharedWith, isPublic);
    clearShareNoteId();

  };

  const clearShareNoteId = () => {
    setShareNoteId(null);
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
    if (showCommitHistory || isHistoryMode) return; 
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
  }, 1000);

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
      setIsPublicNote(noteResponse.isPublicNote || false);
      setParentId(noteResponse.parentId || null);
      setIsRestrictedPage(Boolean(noteResponse.isRestrictedPage));
      setNoteType(noteResponse.noteType as string);
      setSharedWith(noteResponse.sharedWith || []);
      setIsCurrentNoitePublic(noteResponse.isPublicNote || false);
      setCoverUrl(noteResponse.coverUrl || "");
      
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
          setInitialContent(offline_content);
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
        if (offline_content) {
          setInitialContent(offline_content as JSONContent);
        } else {
          setInitialContent(defaultEditorContent);
        }
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
        setIsPublicNote(is_publicNote);
        setIsCurrentNoitePublic(is_publicNote)
        setParentId(parentId);
        setIsRestrictedPage(isRestrictedPage as boolean);
        setNoteType(noteType);
        setCoverUrl(coverUrl);
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
    if (shareNoteId) {
      setShowModal(true);
    }
  }, [shareNoteId]);

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
      editorRef.current.setEditable(!readOnly && !showCommitHistory);
    }
  }, [readOnly, showCommitHistory]);

  useEffect(() => {
    if (!initialContent) return;
    // Wait until the content is rendered or stable
    const timeout = setTimeout(() => {
      console.log("The Content is Ready ==++++> ", initialContent);
      const ids = extractCommentIds(initialContent);
      console.log("Printing the comment Id's --++++>", ids);
      console.log("calling the comment api by id =====+++>")
      fetchCommentsBatch(ids);
    }, 300); // small delay to ensure content mounted
  
    return () => clearTimeout(timeout);
  }, [initialContent, editorKey]);
  

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
      <div className={showCommitHistory ? "pr-[250px]" : ""}>      <div className=" fixed z-20  bg-background dark:bg-background  -mt-2 p-4 w-full" style={{ top: "56px" }}>
        <div className="flex justify-start gap-2  p-4 pt-0 max-w-screen-lg">
        {showCommitHistory && isHistoryMode ? (
          <>
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[#5F5E5B] dark:text-[#9B9B9B]">
              <Lock className="w-4 h-4" />
              <span>Read Only</span>
            </div>
            <div className="pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] transition-colors">
              <button
                type="button"
                className="text-gray-500 font-semibold rounded-sm txt-btn dark:text-white"
                onClick={() => {
                  closeCommitHistory(); 
                }}
              >
              Hide History
            </button>
          </div>
          </>
          ) : isPublish ? (
            <>
              {approvalStatus === "accepted" && (
                <>
                  <CopyLinkButton/>
                  <DeleteButton onDelete={() => setDeleteModalOpen(true)}/>
                </>
              )}

              {approvalStatus === "rejected" && (
                <div className="px-3 py-1 text-sm bg-accent rounded-lg text-red-500 font-semibold">Rejected</div>
              )}
              <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[#5F5E5B] dark:text-[#9B9B9B]">
                {readOnly ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Read Only</span>
                  </>
                ) : (
                  <span>{saveStatus}</span>
                )}
              </div>
              {approvalStatus === "pending" && (
                <>
                  <div
                    className=" pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white  n hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] 
 transition-colors "
                  >
                    <button
                      type="button"
                      className=" text-gray-500  font-semibold rounded-sm txt-btn dark:text-white "
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(editorKey, true);
                      }}
                      disabled={approvalLoading}
                    >
                      {approvalLoading && approvalDirection === "approve" ? "Approving..." : "Approve"}
                    </button>
                  </div>

                  <div className="pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white  d">
                    <button
                      type="button"
                      className=" text-gray-500  font-semibold rounded-sm txt-btn dark:text-white "
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(editorKey, false);
                      }}
                      disabled={approvalLoading}
                    >
                      {approvalLoading && approvalDirection === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[#5F5E5B] dark:text-[#9B9B9B]">
                {readOnly ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Read Only</span>
                  </>
                ) : (
                  <span>{saveStatus}</span>
                )}
              </div>
              {/* {readOnly && !isPublicNote && (
                <div
                  className=" pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white hover:bg-[rgb(248,248,247)] transition-colors  hover:bg-[rgb(248,248,247)] transition-colors  dark:hover:bg-[rgb(39,39,42)] 
 transition-colors"
                >
                  <button
                    type="button"
                    className="text-gray-500  font-semibold rounded-sm txt-btn dark:text-white "
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemoveModal(true);
                      setRemovingNoteId(editorKey);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )} */}
              {!readOnly && !isPublicNote && (
                <div
                  className="pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] 
 transition-colors  hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] 
 transition-colors"
                >
                  <button
                    type="button"
                    className="text-gray-500  font-semibold rounded-sm txt-btn dark:text-white "
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(true);
                    }}
                  >
                    Share
                  </button>
                </div>
              )}
              {/* {!readOnly && !isPublicNote && (
                <div
                  className=" pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white   hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] 
 transition-colors "
                >
                  <button
                    disabled={publishStatus !== "Publish" || publishLoading}
                    type="button"
                    className={`text-gray-500  font-semibold rounded-sm txt-btn dark:text-white  ${
                      publishStatus !== "Publish" || publishLoading ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish(editorKey);
                    }}
                  >
                    {publishLoading ? "Publishing..." : publishStatus === 'pending' ? "In Review" : publishStatus}
                  </button>
                </div>
              )} */}
              {!isPublish && (
                <div className="pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] transition-colors">
                  <button
                    type="button"
                    className="text-gray-500 font-semibold rounded-sm txt-btn dark:text-white"
                    onClick={() => {
                      fetchCommitHistory();
                    }}
                  >
                    View History                 
                  </button>
                </div>
              )}
              {!isPublish && (
                <div className="pl-2 pr-2 rounded-lg px-2 py-1 text-sm text-muted-foregroun txt-btn dark:text-white hover:bg-[rgb(248,248,247)] dark:hover:bg-[rgb(39,39,42)] transition-colors">
                  <button
                    type="button"
                    className="text-gray-500 font-semibold rounded-sm txt-btn dark:text-white"
                    onClick={() => setShowLogs(!showLogs)}
                    >
                    <Clock1 className="w-4 h-4 mr-1 inline" />
                    Activity
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
            <CoverImage
              coverUrl={coverUrl}
              onCoverChange={handleCoverChange}
              onCoverRemove={handleCoverRemove}
              onUploadCover={handleUploadCover}
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
        showCommitHistory={showCommitHistory}
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
        {showCommitHistory && isHistoryMode ? (
          <>
            {commitContentLoading ? (
              <EditorLoading/>
            ):(
              <HistoryEditor
                editorKey={`${editorKey}-history`}
                initialContent={historyEditorContent}
                readOnly={true}
                onContentChange={setHistoryEditorContent}
              />
            )}
          </>
          ): (
            <>
              <div className="flex w-full h-full relative">
                <div className="flex-1 relative">
                  <EditorRoot> 
                    <EditorContent
                      key={`editor-${editorKey}`}
                      // contenteditable={!readOnly}
                      initialContent={ noteType === 'original' ?  undefined : initialContent}
                      extensions={extensions}
                      onCreate={({ editor }) => {
                        editorRef.current = editor;
                        editor.setEditable(!readOnly && !showCommitHistory);
                        setEditorInstance(editor);
                      }}
                      className="flex w-full h-full bg-background dark:bg-background  p-4"
                      editorProps={{
                        handleDOMEvents: {
                          keydown: (_view, event) => handleCommandNavigation(event),
                        },
                        handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                        handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
                        attributes: {
                          class:
                            "prose prose-lg w-[100%] dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full ",
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
                    <CommentSelector open={openComment} onOpenChange={setOpenComment} noteId={editorKey} />
                    <Separator orientation="vertical" />
                    <MathSelector />
                    <Separator orientation="vertical" />
                    <TextButtons />
                    <Separator orientation="vertical" />
                    <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                  </GenerativeMenuSwitch>
                    </EditorContent>
                  </EditorRoot>
                </div>
                {/* Desktop comment panel */}
                <div className="hidden lg:block w-[360px] pl-4 overflow-y-auto">
                  <CommentPanel />
                </div>        
              </div>
              {/* Mobile floating CommentBox */}
              <CommentBox />
            </>
        )}
        {editorRef.current && <TableToolbar editor={editorRef.current} />}
      </div>
      {modal}

      {/* Modal for share button */}
      <ShareModal
        open={showModal}
        invites={invites}
        newEmail={newEmail}
        newPermission={newPermission}
        generalAccess={generalAccess}
        copied={copied}
        onClose={() => {
          onShareComplete?.();
          setShowModal(false);
          setNewEmail("");
          setInvites([]);
          setNewPermission("read");
          clearShareNoteId();
        }}
        onAddInvite={(email, permission) => {
          setInvites([...invites, { email, permission }]);
          setNewEmail("");
          setNewPermission("read");
        }}
        onRemoveInvite={(index) => {
          setInvites(invites.filter((_, i) => i !== index));
        }}
        onPermissionChange={setNewPermission}
        onEmailChange={setNewEmail}
        onShare={() => {
          const noteIdToShare = shareNoteId || editorKey;
          handleInvite(noteIdToShare, invites, generalAccess);
          setInvites([]);
          setShowModal(false);
          onShareComplete?.();
        }}
        onCopyLink={() => {
          const noteIdToShare = shareNoteId || editorKey;
          navigator.clipboard.writeText(`${process.env.DOMAIN}/notes/${noteIdToShare}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        onGeneralAccessChange={setGeneralAccess} // ✅ Only if you want General Access
      />
      
      {/*Deletion Modal */}
      <DeleteConfirmationModal
        header="Delete Note"
        title={editorTitle}
        entity="note"
        isOpen={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (editorKey) {
            setIsDeleting(true);
            setDeleteModalOpen(false);
            try {
              await DeleteNote(editorKey);
              router.push("/notes");
            } catch (err) {
              console.error("Error deleting editor:", err);
            } finally {
              setIsDeleting(false); 
              setDeleteModalOpen(false);
            }
          }
        }}
      />
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="flex items-center gap-2 text-white text-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
            Deleting page...
          </div>
        </div>
      )}

      {/*Remove From Share Modal */}
      <DeleteConfirmationModal
        header="Remove Shared Notes"
        isOpen={showRemoveModal}
        isProcessing={isProcessing}
        title="Remove from Shared Notes"
        message="Are you sure you want to remove this note from shared notes?"
        confirmButtonText="Remove"
        confirmButtonColor="red"
        onCancel={() => setShowRemoveModal(false)}
        onConfirm={async () => {
          if (!removingNoteId) return;
          setIsProcessing(true);
          try {
            await removeSharedPage(removingNoteId);
            setShowRemoveModal(false);
          } catch (err) {
            console.error(err);
          } finally {
            setIsProcessing(false);
            setRemovingNoteId(null);
          }
        }}
      />
      </div>

      {commitHistoryLoading && (
        <div className="bg-white dark:bg-gray-800 mt-1 z-30 shadow-lg rounded-md w-[280px]"
        style={{
          position: "fixed", 
          top: "70px",
          right: "0px",
        }}
        >
          <div className="min-h-[500px] w-full bg-background dark:bg-background sm:rounded-lg p-5">
            {/* Spinner */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Loading History...
              </span>
            </div>

            {/* Skeleton Lines */}
            <div className="space-y-3">
              <div className="h-7 w-3/4 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-2/3 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-24 w-full rounded animate-pulse mt-6 bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
            </div>
          </div>
        </div>
      )}

      {showCommitHistory && isHistoryMode && (
        <div className="bg-white dark:bg-gray-800 mt-1 z-30 shadow-lg rounded-md"
        style={{
          position: "fixed", 
          top: "70px",
          right: "0px",
        }}
        >
          <div className=""> 
              <CommitSlider 
                commits={commits} 
                selectedCommit={selectedCommit}
                onSelectCommit={(commit) => {
                  setSelectedCommit(commit);
                  setCommitContentLoading(true);                  setIsLoading(true);
                  loadCommitContent(commit.sha, commit.version);
                }}
                onApply={applyCommitContent}
                isApplying={isApplyingCommit}
                onClose={() => {
                  closeCommitHistory();
                }}
              />
          </div>
        </div>
        )}

      {showLogs && 
        <div className="fixed top-[60px] right-4 z-50 bg-background shadow-xl rounded-lg border border-gray-200 dark:border-gray-700"
          style={{
            width: "380px",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          <div className="mt-2">
            <div className='px-5 pt-3 flex gap-3 items-center justify-between'>
              <div className="flex gap-3 items-center">
                <p className="m-0 text-md font-semibold">Activity Log</p>
                {!isLogLoading &&
                  <p className="m-0 text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {activityLogs.length} {activityLogs.length === 1 ? 'activity' : 'activities'}
                  </p>
                }
              </div>
              <button
                onClick={() => setShowLogs(false)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Close logs"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
            <ActivityLogContainer logs={activityLogs }
            isLogLoading={isLogLoading}
            />
          </div>
        </div>
      }
      <EmbedModalWrapper />
      </div>
  );
};

export default TailwindAdvancedEditor;
