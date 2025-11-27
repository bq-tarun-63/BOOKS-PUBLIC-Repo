"use client";
import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useCommentPanel } from "@/contexts/inlineCommentContext";

interface CommentBoxProps {
  commentId?: string;
}

// Client-side wrapper component
const CommentBoxClient: React.FC<CommentBoxProps> = ({ commentId }) => {
  const { openComment, togglePanel } = useCommentPanel();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (commentId) openComment(commentId);
    else togglePanel();
  };

  return (
    <div
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[10000] p-3 rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:scale-110 transition-transform sm:hidden"
      title="Open Comments"
    >
      <MessageSquare className="w-5 h-5" />
    </div>
  );
};

// Main component with client-side rendering check
const CommentBox: React.FC<CommentBoxProps> = ({ commentId }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render on server side or before hydration
  if (!isClient) {
    return null;
  }

  return <CommentBoxClient commentId={commentId} />;
};

export default CommentBox;
