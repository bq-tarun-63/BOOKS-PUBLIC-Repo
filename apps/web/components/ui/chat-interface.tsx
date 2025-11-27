"use client";
import useFetchRootNodes from "@/hooks/use-fetchRootData";
import { postWithAuth } from "@/lib/api-helpers";
// Removed useCompletion as we're using the editor's Ask AI instead
// Removed unused imports
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
// Removed Markdown import - no longer generating content in chat
import { toast } from "sonner";
import { Button } from "../tailwind/ui/button";
import { SendIcon, StopIcon, PhotoIcon, EmojiIcon } from "../tailwind/ui/icons";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: "search_results" | "note_created" | "content_generation" | undefined;
  data?: SearchResult[] | { noteId: string; title: string } | ContentGenData | null;
  timestamp: number;
}

interface ContentGenData {
  noteId: string;
  title: string;
  prompt: string;
  requiresConfirmation: boolean;
  generatedContent?: string;
}

interface SearchResult {
  noteId: string;
  title: string;
  score: number;
  preview?: string;
  url: string;
}

interface ChatContext {
  currentNoteId?: string;
  currentPath?: string;
  navigationUrl?: string;
  permissions?: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canManageUsers: boolean;
    accessLevel: string;
  };
}

interface ChatInterfaceProps {
  currentNoteId?: string | null;
  currentNoteTitle?: string;
  userEmail?: string;
  userName?: string;
  onThinkingChange?: (thinking: boolean) => void; // NEW PROP
}

export default function ChatInterface({
  currentNoteId,
  currentNoteTitle,
  userEmail,
  userName,
  onThinkingChange,
}: ChatInterfaceProps) {
  const storageKey = userEmail ? `chatWidgetHistory_${userEmail}` : undefined;
  const getInitialMessages = () => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const now = Date.now();
          // Only keep messages from the last 24 hours
          const filtered = parsed.filter((msg: ChatMessage) => now - msg.timestamp < 24 * 60 * 60 * 1000);
          return filtered.length > 0
            ? filtered
            : [
                {
                  role: "assistant",
                  content: "Hi! I'm your notes assistant. How can I help you today?",
                  timestamp: Date.now(),
                },
              ];
        } catch {
          // fallback to default if corrupted
        }
      }
    }
    return [
      { role: "assistant", content: "Hi! I'm your notes assistant. How can I help you today?", timestamp: Date.now() },
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { refetch: fetchRootData } = useFetchRootNodes();

  // Hook for content generation using the same API as the editor
  // Removed useCompletion hook - we're using the editor's Ask AI directly

  // When userEmail changes, reload chat history for that user
  useEffect(() => {
    if (!storageKey) {
      setMessages([
        {
          role: "assistant",
          content: "Hi! I'm your notes assistant. How can I help you today?",
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    // Get saved chat history from local storage
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const filtered = parsed.filter((msg: ChatMessage) => now - msg.timestamp < 24 * 60 * 60 * 1000);
        setMessages(
          filtered.length > 0
            ? filtered
            : [
                {
                  role: "assistant",
                  content: "Hi! I'm your notes assistant. How can I help you today?",
                  timestamp: Date.now(),
                },
              ],
        );
      } catch {
        setMessages([
          {
            role: "assistant",
            content: "Hi! I'm your notes assistant. How can I help you today?",
            timestamp: Date.now(),
          },
        ]);
      }
    } else {
      setMessages([
        {
          role: "assistant",
          content: "Hi! I'm your notes assistant. How can I help you today?",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [storageKey]);

  // Save history on change
  useEffect(() => {
    if (!storageKey) return;
    const now = Date.now();
    const recentMessages = messages.filter((msg) => now - msg.timestamp < 24 * 60 * 60 * 1000);
    localStorage.setItem(storageKey, JSON.stringify(recentMessages));
  }, [messages, storageKey]);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Notify parent when isLoading changes
  useEffect(() => {
    if (onThinkingChange) {
      onThinkingChange(isLoading);
    }
  }, [isLoading, onThinkingChange]);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Check initial theme
    checkTheme();

    // Create observer to watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    // Start observing the document element for class changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup observer on unmount
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: "user", content: inputText, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInputText("");

    try {
      // Send request to API with current note context
      const response = await postWithAuth<{
        response: string;
        action?: {
          success: boolean;
          message: string;
          data?: SearchResult[] | Record<string, unknown>;
          navigationUrl?: string;
          createdNoteId?: string;
          noteTitle?: string;
        };
        context?: ChatContext;
      }>("/api/chat", {
        query: userMessage.content,
        history: messages.slice(-6), // Send last 6 messages for context
        currentNoteId: currentNoteId, // Pass current note ID for context
        userEmail: userEmail, // Pass user email for better context
        userName: userName, // Pass user name for personalization
      });

      console.log("Chat API response:", response);

      // After the API call, before using response.response, response.action, etc.
      if ("response" in response) {
        // Add more detailed logging of the response
        console.log("Full API response for debugging:", {
          actionSuccess: response.action?.success,
          navigationUrl: response.action?.navigationUrl,
          hasContext: !!response.context,
          responseLength: response.response?.length,
          noteTitle: response.action?.noteTitle,
        });

        // Update context if returned
        if (response.context) {
          setContext(response.context);
        }

        // Handle navigation if needed
        if (response.action?.navigationUrl) {
          const noteTitle = response.action.noteTitle || "requested note";
          const navigationUrl = response.action.navigationUrl;
          console.log(`Navigation requested to: ${navigationUrl} (${noteTitle})`);

          // First update the sidebar data
          fetchRootData();

          // Use Next.js router for smooth client-side navigation
          router.push(navigationUrl);

          // Store the navigation info for verification in ChatWidget
          window.sessionStorage.setItem("pendingNavigation", navigationUrl);
          window.sessionStorage.setItem("navigationTimestamp", Date.now().toString());
        } else if (response.action?.success === false && response.action?.message?.includes("Could not find")) {
          // Handle navigation error when a note can't be found
          console.log(`Navigation error: ${response.action.message}`);
        }

        // Determine if this is a content generation response
        // Special case: If search returned no results but it contains "advantages and disadvantages"
        // in the query, convert it to a content generation request
        if (
          response.action?.success &&
          Array.isArray(response.action.data) &&
          response.action.data.length === 0 &&
          (userMessage.content.toLowerCase().includes("advantages and disadvantages") ||
            userMessage.content.toLowerCase().includes("add content") ||
            userMessage.content.toLowerCase().includes("write about"))
        ) {
          // Extract the topic from the query
          let topic = userMessage.content || "";
          if (topic?.toLowerCase()?.includes(" to ")) {
            topic = topic.split(" to ")[0] || topic;
          }
          if (topic?.toLowerCase()?.includes("advantages and disadvantages")) {
            topic = `advantages and disadvantages of ${currentNoteTitle || "the topic"}`;
          }

          // Convert to content generation response
          response.action.data = {
            noteId: context?.currentNoteId || currentNoteId,
            title: currentNoteTitle || "Current Note",
            prompt: topic,
            requiresConfirmation: true,
          };

          // Update message to reflect the new action
          response.response = `I'll help you add content about ${topic} to your "${currentNoteTitle || "current"}" note. Click the Generate Content button below to proceed.`;
        }

        // Check if the response is for content generation
        const isContentGenResponse =
          response.action?.success &&
          response.action.data &&
          // Case 1: Single object format
          ((!Array.isArray(response.action.data) &&
            typeof response.action.data === "object" &&
            "noteId" in response.action.data &&
            "requiresConfirmation" in response.action.data) ||
            // Case 2: Array format
            (Array.isArray(response.action.data) &&
              response.action.data.length > 0 &&
              typeof response.action.data[0] === "object" &&
              "noteId" in response.action.data[0] &&
              "requiresConfirmation" in response.action.data[0]));

        // Handle content generation automatically
        if (isContentGenResponse && response.action?.data) {
          let contentData: ContentGenData;

          if (!Array.isArray(response.action.data)) {
            // Single object format
            contentData = response.action.data as unknown as ContentGenData;
          } else if (Array.isArray(response.action.data) && response.action.data.length > 0) {
            // Array format - use the first item
            contentData = response.action.data[0] as unknown as ContentGenData;
          } else {
            // Fallback
            contentData = {
              noteId: context?.currentNoteId || currentNoteId || "",
              title: currentNoteTitle || "Current Note",
              prompt: userMessage.content,
              requiresConfirmation: true,
            };
          }

          // Format the prompt for better AI understanding
          const improvedPrompt = formatPromptForAI(contentData.prompt, contentData.title);

          // Add message indicating we're opening Ask AI
          const aiMessage: ChatMessage = {
            role: "assistant",
            content: `Opening Ask AI in "${contentData.title}" note to generate the requested content...`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          // Automatically trigger Ask AI
          handleGenerateContent(improvedPrompt, contentData.noteId);
          return;
        }

        // Create new message with the right type for non-content-generation responses
        const newMessage: ChatMessage = {
          role: "assistant",
          content: response.response,
          timestamp: Date.now(),
        };

        // Handle action type
        if (response.action?.success) {
          if (response.action.data && Array.isArray(response.action.data)) {
            newMessage.action = "search_results";
          } else if (response.action.createdNoteId) {
            newMessage.action = "note_created";
          }
        }

        // Handle data based on action type
        if (response.action?.data) {
          if (Array.isArray(response.action.data)) {
            // Search results array
            newMessage.data = response.action.data;
          }
        } else if (response.action?.createdNoteId) {
          newMessage.data = {
            noteId: response.action.createdNoteId,
            title: response.action.message?.includes("Created note")
              ? response.action.message.replace("Created note ", "").replace(" successfully", "")
              : "New Note",
          };
        } else {
          newMessage.data = null;
        }

        // Add new message to previous messages
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // Handle error response
        console.error("Invalid response format:", response);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.error || "Sorry, I encountered an error processing your request.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to format prompts for better AI understanding
  const formatPromptForAI = (originalPrompt: string | undefined, noteTitle: string) => {
    if (!originalPrompt) return `Write comprehensive content about ${noteTitle}`;

    // Just make sure the prompt is clear and mentions the note title for context
    return `${originalPrompt} for the "${noteTitle}" note. Please provide well-structured content.`;
  };

  // Display context info in the header
  const contextInfo = currentNoteId ? `Current note: ${currentNoteTitle || currentNoteId}` : "Not in a note";

  // Function to navigate to note and trigger Ask AI
  const handleGenerateContent = async (prompt: string | undefined, noteId: string) => {
    if (!prompt || !noteId) return;

    try {
      // Navigate to the note and trigger Ask AI with the prompt
      const currentPath = window.location.pathname;
      const isCurrentNote = currentPath === `/notes/${noteId}`;

      if (isCurrentNote) {
        // If we're already on the note, trigger Ask AI directly
        const editorEvent = new CustomEvent("insert-ai-content", {
          detail: { content: prompt },
        });
        window.dispatchEvent(editorEvent);
        toast.success("Opening Ask AI with your prompt");
      } else {
        // Navigate to the note with the AI content parameter
        toast.success("Navigating to note and opening Ask AI");
        window.location.href = `/notes/${noteId}?ai_content=${encodeURIComponent(prompt)}`;
      }

      // Update the message to show that we've triggered Ask AI
      setMessages((prev) => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex]?.action === "content_generation") {
          const updatedMessages = [...prev] as ChatMessage[];
          const msg = updatedMessages[lastIndex];
          if (msg?.data) {
            const data = msg.data as ContentGenData;
            updatedMessages[lastIndex] = {
              role: msg.role,
              timestamp: msg.timestamp,
              content: `Ask AI has been opened in the "${data.title}" note with your prompt. The content will be generated there.`,
              action: undefined,
              data: null,
            };
          }
          return updatedMessages;
        }
        return prev;
      });
    } catch (error) {
      toast.error("Failed to open Ask AI. Please try again.");
      console.error("Ask AI trigger error:", error);
    }
  };

  // This function is no longer needed - we directly trigger Ask AI in the editor

  // No longer needed - we directly trigger Ask AI in the editor

  const userInfo = userEmail ? `User: ${userName || userEmail}` : "";

  return (
    <div className="flex flex-col h-full rounded-b-[20px] border-l border-r border-b border-gray-200 dark:border-zinc-700 overflow-hidden text-[14px]">
      {/* <div className="p-4 pt-0 pb-2 ">
        <div className="text-[12px] text-gray-500 dark:text-zinc-300">
          <div className="font-bold">{contextInfo}</div>
          {userInfo && <div className="font-bold">{userInfo}</div>}
        </div>
      </div> */}

      <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4 chat-scrollbar">
        {messages.map((message, i) => (
          <div
            key={`${message.role}-${i}-${message.content.substring(0, 10)}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] ${
                message.role === "user"
                  ? "text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.15),0_8px_32px_rgba(0,0,0,0.2)]"
                  : "text-black dark:text-white relative"
              } bg-white/30 dark:bg-white/5 backdrop-blur-[12px] border border-white/5
              
                before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[0.5px] 
                  before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent
                after:content-[''] after:absolute after:top-0 after:left-0 after:w-[0.5px] after:h-full 
                  after:bg-gradient-to-b after:from-white/25 after:via-transparent after:to-white/10`}
              style={{ 
                padding: "6px 14px", 
                borderRadius: message.role === "user" 
                  ? "10px 0px 10px 10px" 
                  : "0px 10px 10px 10px",
                position: "relative",
                ...(message.role === "assistant" && {
                  boxShadow: `
                    -4px -2px 8px rgba(255, 107, 158, 0.15),
                    4px -2px 8px rgba(161, 98, 232, 0.15),
                    -2px -4px 12px rgba(255, 107, 158, 0.1),
                    2px -4px 12px rgba(161, 98, 232, 0.1),
                    0px 8px 20px rgba(94, 124, 226, 0.2),
                    0px 4px 12px rgba(94, 124, 226, 0.15)
                  `
                })
              }}
            >
              <p>{message.content}</p>

              {/* Render search results if available */}
              {message.action === "search_results" && message.data && Array.isArray(message.data) && (
                <div className="mt-2 flex flex-col gap-2">
                  {message.data.length > 0 ? (
                    message.data.map((result: SearchResult) => (
                      <a
                        key={result.noteId}
                        href={result.url}
                        className="p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <h4 className="font-medium text-blue-600">{result.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {result.preview || "No preview available"}
                        </p>
                      </a>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No relevant notes found.</p>
                  )}
                </div>
              )}

              {/* Render link to created note */}
              {message.action === "note_created" && message.data && !Array.isArray(message.data) && (
                <a
                  href={`/notes/${message.data.noteId}`}
                  className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors"
                >
                  Open Note: {message.data.title}
                </a>
              )}

              {/* Content generation is now handled automatically - no UI needed */}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Loading animation above input */}
      {isLoading && (
        <div className="flex justify-start items-center py-1 pl-8">
          <span className="text-gray-500 dark:text-zinc-400 mr-2 text-[12px]">Thinking</span>
          <div className="flex space-x-1">
            <div
              className="w-1 h-1 rounded-full animate-bounce"
              style={{ backgroundColor: "#FF6B9E", animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-1 rounded-full animate-bounce"
              style={{ backgroundColor: "#A162E8", animationDelay: "150ms" }}
            />
            <div
              className="w-1 h-1 rounded-full animate-bounce"
              style={{ backgroundColor: "#5E7CE2", animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`border-t border-transparent p-4${isLoading ? " pt-0" : ""}`}>
        <div className="relative flex items-center w-full max-w-2xl mx-auto">
          <Button
            type="button"
            disabled={isLoading}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-0 w-8 h-8 flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-400 disabled:text-gray-400 z-10 transition-colors"
            aria-label="Add emoji"
            tabIndex={0}
            onClick={() => {
              // TODO: Implement emoji picker functionality
              toast.info("Emoji picker feature coming soon!");
            }}
          >
            <EmojiIcon size={20} />
          </Button>
          <input
            type="text"
            className="flex-1 pr-20 pl-10 py-2 rounded-[20px] border-none bg-transparent focus:outline-none text-[14px] transition disabled:opacity-50"
            placeholder="Ask about notes or create one..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            aria-label="Chat input"
            style={{ minHeight: 36 }}
          />
          <Button
            type="button"
            disabled={isLoading}
            className="absolute right-10 top-1/2 -translate-y-1/2 rounded-full p-1 w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-600 dark:text-zinc-400 transition-colors disabled:bg-gray-100 disabled:text-gray-400 shadow-md"
            aria-label="Upload photo"
            tabIndex={0}
            onClick={() => {
              // TODO: Implement photo upload functionality
              toast.info("Photo upload feature coming soon!");
            }}
          >
            <PhotoIcon size={16} />
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 w-6 h-6 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:bg-gray-300 disabled:text-gray-400 shadow-md"
            aria-label={isLoading ? "Stop" : "Send message"}
            tabIndex={0}
          >
            {isLoading ? <StopIcon size={16} /> : <SendIcon size={16} />}
          </Button>
        </div>
      </form>
    </div>
  );
}
