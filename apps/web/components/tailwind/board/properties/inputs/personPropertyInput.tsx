import React from "react";
import { useState } from "react";
import { Members } from "@/types/workspace";
import MemberSelectionModal from "../../members";

interface Props {
  value: Members[];
  onChange: (selected: Members[]) => void;
  availableMembers: Members[];
  defaultOpen?: boolean; 
  onClose?: () => void;
}

export const PersonPropertyInput: React.FC<Props> = ({ value, onChange, availableMembers, defaultOpen = false, onClose }) => {
  const selectedMembers = Array.isArray(value) ? value : [];
  const [modalOpen, setModalOpen] = useState(!!defaultOpen);

  const handleRemoveMember = (memberToRemove: Members, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = selectedMembers.filter(m => m.userId !== memberToRemove.userId);
    onChange(newSelection);
  };

  const handleModalSelect = (selected: Members[]) => {
    onChange(selected);
    setModalOpen(false);
    onClose?.();
  };

  return (
    <div 
      className="relative px-2 py-1.5 gap-1 items-center w-[250px] hover:bg-gray-200 dark:hover:bg-[#2c2c2c] cursor-pointer rounded-sm"
      onClick={(e) => {
        e.stopPropagation();
        setModalOpen(true);
      }}
    >
      {selectedMembers.length > 0 ? (
        <div className="mr-2">
          {selectedMembers.map((member) => (
            <div
              key={member.userId}
              className="flex items-center py-1 rounded-lg gap-2 text-sm"
            >
              <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                <div className="w-5 h-5 rounded-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-[#3c3c3c] flex items-center justify-center text-xs text-gray-500 dark:text-gray-300">
                  {member.userName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-normal text-gray-900 dark:text-gray-100 truncate">
                  {member.userName}
                </div>
              </div>
            </div>
          ))}
        </div>
      ):(
        <div className="text-sm font-normal text-gray-400 dark:text-gray-100 truncate">
        Assign
        </div>
      )}

      <div className="absolute top-0 left-0 z-10">
      {modalOpen && (
        <MemberSelectionModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); onClose?.(); }}
          members={availableMembers}
          selectedMembers={selectedMembers}
          onSelectMember={handleModalSelect}
        />
      )}
      </div>
    </div>
  );
};
