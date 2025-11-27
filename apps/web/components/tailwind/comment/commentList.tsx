"use client";

import { Comment } from "@/types/board";
import CommentItem from "./commentItem";


interface CommentListProps {
  comments: Comment[];
  onEditComment?: (commentId: string, newText: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export default function CommentList({
  comments,
  onEditComment,
  onDeleteComment,
}: CommentListProps) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.commentId}
          comment={comment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      ))}
    </div>
  );
}
