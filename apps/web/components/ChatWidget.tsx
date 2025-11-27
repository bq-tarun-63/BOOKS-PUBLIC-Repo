"use client";
import { useNoteContext } from "@/contexts/NoteContext";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ChatInterface from "./ui/chat-interface";
import { ChatIcon, OuterChatIcon } from "./tailwind/ui/icons";

export default function ChatWidget() {
  const { isPremiumUser } = useNoteContext();
  const [open, setOpen] = useState(false);
  const { selectedNoteId, activeTitle, notes , editorTitle} = useNoteContext();
  const { user } = useAuth();
  const pathname = usePathname() || "";

  // Extract the note ID from the URL if it's not in context
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(selectedNoteId);
  const [currentNoteTitle, setCurrentNoteTitle] = useState<string | undefined>(editorTitle);
  const [animationKey, setAnimationKey] = useState(0); // Key to reset animations
  const [isThinking, setIsThinking] = useState(false); // Track thinking state

  useEffect(() => {
    const noteIdFromPath = pathname.match(/^\/notes\/([^\/\?]+)/)?.[1] || null;
    const noteId = selectedNoteId || noteIdFromPath;
    setCurrentNoteId(noteId);

    if (noteId && !(editorTitle) && notes) {
      const note = notes.find((n) => n.id === noteId);
      if (note) setCurrentNoteTitle(note.title);
    } else {
      setCurrentNoteTitle(editorTitle);
    }
  }, [pathname, selectedNoteId, notes, editorTitle]);

  // Add a simple effect to check navigation completion
  useEffect(() => {
    // Function to check if navigation completed successfully
    const checkNavigation = () => {
      const pendingNav = window.sessionStorage.getItem("pendingNavigation");
      const navTimestamp = window.sessionStorage.getItem("navigationTimestamp");

      if (pendingNav && navTimestamp) {
        const timestamp = Number.parseInt(navTimestamp, 10);
        const isRecent = Date.now() - timestamp < 2000;

        if (isRecent) {
          // We're already on the correct page
          if (window.location.pathname === pendingNav) {
            window.sessionStorage.removeItem("pendingNavigation");
            window.sessionStorage.removeItem("navigationTimestamp");
            return;
          }

          // Navigation didn't complete, use fallback
          window.location.href = pendingNav;
          window.sessionStorage.removeItem("pendingNavigation");
          window.sessionStorage.removeItem("navigationTimestamp");
        } else {
          // Clean up old navigation data
          window.sessionStorage.removeItem("pendingNavigation");
          window.sessionStorage.removeItem("navigationTimestamp");
        }
      }
    };

    // Check on mount and path change
    checkNavigation();

    // Set up a short-lived interval
    const interval = setInterval(checkNavigation, 1000);
    setTimeout(() => clearInterval(interval), 3000);

    return () => clearInterval(interval);
  }, [pathname]);

  const handleOpenChat = () => {
    setAnimationKey((prev) => prev + 1); // Reset animations
    setOpen((o) => !o);
  };

  // Handler for ChatInterface to notify when thinking/loading state changes
  const handleThinkingChange = (thinking: boolean) => {
    // Only trigger animation when going from not thinking to thinking
    if (thinking && !isThinking) {
      setAnimationKey(prev => prev + 1);
    }
    setIsThinking(thinking);
  };

  if (!isPremiumUser) return null;
  else
  return (
    <>
      
        <button
          type="button"
          onClick={handleOpenChat}
          className="fixed bottom-6 mt-2 right-6 z-[1000] transition-transform duration-200 hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <OuterChatIcon width={54} height={54} />
        </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-[1001] w-[370px] max-w-[90vw] h-[500px] max-h-[80vh] flex items-center justify-center">
          {/* Glow SVG, larger and behind the chat window */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
               style={{ width: 380, height: 510 }}>
            <svg
              key={`glow-${animationKey}`}
              width={380}
              height={510}
              viewBox="0 0 380 510"
              style={{ filter: "blur(4px)" }}
            >
              <defs>
                <linearGradient id="borderGlowGradient" gradientTransform="rotate(45)">
                  <stop offset="0%" stopColor="#5E7CE2" />
                  <stop offset="16%" stopColor="#4D8AFF" />
                  <stop offset="32%" stopColor="#8A2BE2" />
                  <stop offset="48%" stopColor="#A162E8" />
                  <stop offset="64%" stopColor="#FF4D8D" />
                  <stop offset="80%" stopColor="#FF6B9E" />
                  <stop offset="100%" stopColor="#5E7CE2" />
                </linearGradient>
              </defs>
              <rect
                x="5" y="5"
                width="370"
                height="500"
                rx="20"
                fill="none"
                stroke="url(#borderGlowGradient)"
                strokeWidth="0.5"
                className={isThinking ? "single-revolution-glow-loop" : "single-revolution-glow"}

              />
            </svg>
          </div>

          {/* White glow effect */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-5"
            style={{ width: 380, height: 510 }}
          >
            <svg
              key={`white-glow-${animationKey}`}
              width={380}
              height={510}
              viewBox="0 0 380 510"
              style={{ filter: "blur(4px)" }}
            >
              <rect
                x="5"
                y="5"
                width="370"
                height="500"
                rx="20"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
                className={isThinking ? "single-revolution-white-loop" : "single-revolution-white"}

              />
            </svg>
          </div>

          {/* Chat window */}
          <div className="relative w-[370px] h-[500px] max-w-[90vw] max-h-[80vh] z-10">
            {/* 1px animated gradient border on chat window edge */}
            <svg
              key={`border-${animationKey}`}
              className="absolute left-0 top-0 w-full h-full pointer-events-none z-20"
              viewBox="0 0 370 500"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="borderEdgeGradient" gradientTransform="rotate(45)">
                  <stop offset="0%" stopColor="#5E7CE2" />
                  <stop offset="16%" stopColor="#4D8AFF" />
                  <stop offset="32%" stopColor="#8A2BE2" />
                  <stop offset="48%" stopColor="#A162E8" />
                  <stop offset="64%" stopColor="#FF4D8D" />
                  <stop offset="80%" stopColor="#FF6B9E" />
                  <stop offset="100%" stopColor="#5E7CE2" />
                </linearGradient>
              </defs>
              <rect
                x="0.5"
                y="0.5"
                width="369"
                height="499"
                rx="20"
                fill="none"
                stroke="url(#borderEdgeGradient)"
                strokeWidth="0.5"
                className={isThinking ? "single-revolution-border-loop" : "single-revolution-border"}
              />
            </svg>

            <div className="relative w-full h-full p-1">
              <div className="relative z-10 w-full h-full rounded-[20px] overflow-hidden flex flex-col
                bg-white/30 dark:bg-white/5 backdrop-blur-[12px] border border-white/5
                shadow-[0_4px_24px_rgba(0,0,0,0.05),inset_0_0_4px_2px_rgba(255,255,255,0.2)]
                before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[0.5px] 
                  before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent
                after:content-[''] after:absolute after:top-0 after:left-0 after:w-[0.5px] after:h-full 
                  after:bg-gradient-to-b after:from-white/25 after:via-transparent after:to-white/10">
                <div className="border-t border-l border-r border-gray-200 dark:border-zinc-700 rounded-t-[20px] flex justify-between items-start p-2 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[4px] after:bg-gradient-to-r after:from-pink-400 after:via-purple-500 after:to-blue-400">
                  <div className="flex flex-row pt-2 pl-2 pr-2 pb-3 items-center gap-4 mx-auto">
                    <div className={`z-[1000] transition-transform duration-200 active:scale-95${isThinking ? ' assistant-thinking-glow' : ''}`}>
                      <ChatIcon width={50} height={50} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold pt-1 text-black dark:text-white">Notes Assistant</h3>
                      <p className="text-xs text-left text-black dark:text-white">A live chat interface that allows for seamless, natural communication and connection.</p>
                    </div>
                  </div>
                  
                  {/* <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none"
                    aria-label="Close chat"
                  >
                    ×
                  </button> */}
                </div>
                <div className="flex-1 overflow-auto">
                  <ChatInterface
                    currentNoteId={currentNoteId}
                    currentNoteTitle={currentNoteTitle}
                    userEmail={user?.email}
                    userName={user?.name}
                    onThinkingChange={handleThinkingChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
