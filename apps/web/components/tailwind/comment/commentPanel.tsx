"use client";

import React, { useEffect, useState } from "react";
import { useCommentPanel } from "@/contexts/inlineCommentContext";
import InlineCommentCard from "./inlineCommentCard";

const CommentPanelClient: React.FC = () => {
  const { comments, closePanel } = useCommentPanel();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;



  return (
    <div
      className={`flex justify-center  h-full min-w-[310px] w-auto px-4 py-2 bg-background z-[9999] transition-all duration-300 overflow-y-auto ${
        isMobile ? "" : "max-w-full min-w-full"
      }`}
    >
      
      {/* Comment Threads */}
      {comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((commentThread) => (
            <InlineCommentCard
              key={commentThread._id}
              thread={commentThread}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic mt-4">
          {comments ? "" : ""}
        </p>
      )}
    </div>
  );
};

const CommentPanel: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;
  return <CommentPanelClient />;
};

export default CommentPanel;
