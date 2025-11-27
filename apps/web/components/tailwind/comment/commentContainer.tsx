"use client";

import { useState } from "react";
import CommentList from "./commentList";
import CommentInputBox from "./commentInputBox";
import { Comment, Note } from "@/types/board";
import { CommentProvider, useComments } from "@/contexts/commentContext";

interface CommentContainerProps {
  comments?: Comment[];
  noteId: string;
  boardId: string;
  note: Note;
}

function CommentContainerInner({ noteId }: { noteId: string }) {
  const { comments, addComment, editComment, deleteComment } = useComments();
  const [showAll, setShowAll] = useState(false);
  const displayedComments = showAll ? comments : comments.slice(0, 3);

  return (
    <div className="w-full bg-transparent px-5">
      {/* <div className="pb-1 text-[13px] font-medium text-gray-500 dark:text-gray-400">
        Comments
      </div> */}

      <div className="flex flex-col gap-3">
        <CommentList
          comments={displayedComments}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
        />

        {comments.length > 3 && (
          <button
            className="text-xs text-gray-600 dark:text-gray-200 hover:underline mt-1"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : `View all ${comments.length} comments`}
          </button>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 pb-5 mb-1">
          <CommentInputBox onSubmit={addComment} noteId={noteId} />
        </div>
      </div>
    </div>
  );
}

export default function CommentContainer({ comments = [], noteId , boardId, note }: CommentContainerProps) {
  return (
    <CommentProvider initialComments={comments} noteId={noteId} boardId={boardId} note={note}>
      <CommentContainerInner noteId={noteId} />
    </CommentProvider>
  );
}
