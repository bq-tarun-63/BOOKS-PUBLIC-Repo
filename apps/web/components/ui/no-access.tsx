"use client";

import { Button } from "@/components/tailwind/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

interface NoAccessProps {
  noteId?: string;
  noteTitle?: string;
  message?: string;
}

export function NoAccessMessage({
  noteId,
  noteTitle = "This note",
  message = "You don't have access to this note",
}: NoAccessProps) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-md space-y-6 p-6">
        <div className="space-y-2">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Access denied icon"
            role="img"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <line x1="9" x2="15" y1="9" y2="15" />
            <line x1="15" x2="9" y1="9" y2="15" />
          </svg>
          <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">{message}</p>
          {noteTitle && noteTitle !== "This note" && <p className="font-medium">"{noteTitle}"</p>}
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You are signed in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={() => router.push("/notes")}>Go to My Notes</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
