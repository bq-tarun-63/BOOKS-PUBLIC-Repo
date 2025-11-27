import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useNoteContext } from "@/contexts/NoteContext";
import { useParams } from "next/navigation";
import { Members } from "@/types/workspace";

interface MentionListProps {
  query: string;
  command: (item: { id: string; label: string }) => void;
  onMention?: (item: { id: string; label: string },workspaceId) => void;
}

// Define the type for the ref
export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// forwardRef to expose onKeyDown to TipTap
const MentionList = forwardRef(({ query, command, onMention}: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { workspaceMembers, allWorkspaceMemberName ,currentWorkspace} = useWorkspaceContext();
  const { editorTitle ,sharedWith ,iscurrentNotPublic} = useNoteContext();
  const params = useParams();

  const noteId = params?.noteId as string;

  let mentionMembers: Members[] = [];

  if (!iscurrentNotPublic) {
    mentionMembers = sharedWith.map((u, index) => {
      const matchedMember = workspaceMembers.find(
        (wm) => wm.userEmail === u.email
      );
  
      return {
        userId: matchedMember ? matchedMember.userId : `shared-${index}`,
        userEmail: u.email,
        role: u.access,
        joinedAt: matchedMember ? matchedMember.joinedAt : "",
        userName: matchedMember ? matchedMember.userName : u.email, // fallback to email if no match
      };
    });
  } else {
    mentionMembers = workspaceMembers;
  }

  // Filter workspace members based on the query
  const mentionItems = mentionMembers
  .map((member, index) => ({ 
        id: member.userId, 
        label: member.userName,
        userId: member.userId,
        userEmail: member.userEmail,
        userName: member.userName,
        noteTitle: editorTitle,
        noteId,
        type: 'MENTION',
        role: member.role
    }))
    .filter(item => item.label.toLowerCase().startsWith(query.toLowerCase()));

    const selectItem = (index: number) => {
    const item = mentionItems[index];
    if(!item) return;
    
    command({id: item.id , label: item.label});
    onMention?.(item,currentWorkspace?._id); // trigger the notification
            
  };

  const upHandler = () =>
    setSelectedIndex(index => (index + mentionItems.length - 1) % mentionItems.length);
  const downHandler = () =>
    setSelectedIndex(index => (index + 1) % mentionItems.length);
  const enterHandler = () => selectItem(selectedIndex);


  // Expose onKeyDown to TipTap via ref
  useImperativeHandle(ref, () => ({
    onKeyDown: (props: { event: KeyboardEvent }) => {
      const e = props.event;
      if (e.key === "ArrowUp") { upHandler(); e.preventDefault(); return true; }
      if (e.key === "ArrowDown") { downHandler(); e.preventDefault(); return true; }
      if (e.key === "Enter") { enterHandler(); e.preventDefault(); return true; }
      if (e.key === "Escape") { e.preventDefault(); return true; }
      return false;
    },
  }));

  return (
    <div className="bg-background dark:bg-background  rounded-md border border-muted shadow-md backdrop-blur-sm overflow-hidden min-w-[280px]">
      <div className="m-2">
      {mentionItems.length ? (
        <div className="max-h-64 overflow-y-auto">
          {mentionItems.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-accent aria-selected:bg-accent
                ${i === selectedIndex ? "bg-accent aria-selected:bg-accent rounded-md" : ""}
              `}
              onClick={() => selectItem(i)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-md border border-muted bg-background dark:bg-background text-black dark:text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {item.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full  bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                    {item.role}
                  </span>
                </div>
                {item.userEmail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 mb-0">
                    {item.userEmail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            No users found
          </p>
        </div>
      )}
    </div>
    </div>
  );
});

export default MentionList;
