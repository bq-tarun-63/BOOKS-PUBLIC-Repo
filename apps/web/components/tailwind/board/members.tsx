"use client"

import React from "react";
import { useEffect, useRef, useState } from "react";
import { Members } from "@/types/workspace";
import { Search } from "lucide-react";

interface MemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (members: Members[]) => void;
  members?: Members[];
  selectedMembers?: Members[];
}

// Member Selection Modal Component
export default function MemberSelectionModal({
  isOpen,
  onClose,
  onSelectMember,
  members = [],
  selectedMembers = [],
}: MemberSelectionModalProps) {

  const [selected, setSelected] = useState<Members[]>(selectedMembers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<Members[]>(members);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const memberListRef = useRef<HTMLDivElement>(null);
  const initialSelectedRef = useRef<Members[]>(selectedMembers);

  // Update selected when selectedMembers changes
  useEffect(() => {
    setSelected(selectedMembers);
    initialSelectedRef.current = [...selectedMembers];
  }, [selectedMembers]);

  // Filter members based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMembers(members);
      setHighlightedIndex(-1);
      return;
    }

    const filtered = members.filter(member =>
      member.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMembers(filtered);
    setHighlightedIndex(-1);
  }, [searchTerm, members]);

  // scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && memberListRef.current) {
      const listElement = memberListRef.current;
      const itemElement = listElement.children[highlightedIndex] as HTMLElement;
      
      if (itemElement) {
        const itemTop = itemElement.offsetTop;
        const itemBottom = itemTop + itemElement.offsetHeight;
        const containerTop = listElement.scrollTop;
        const containerBottom = containerTop + listElement.offsetHeight;

        if (itemTop < containerTop) {
          listElement.scrollTop = itemTop;
        } else if (itemBottom > containerBottom) {
          listElement.scrollTop = itemBottom - listElement.offsetHeight;
        }
      }
    }
  }, [highlightedIndex]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const modalElement = document.querySelector('[data-modal="member-selection"]');
      if (modalElement && !modalElement.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, selected]);

  const toggleMember = (member: Members) => {
    if (selected.some((m) => m.userId === member.userId)) {
      setSelected(selected.filter((m) => m.userId !== member.userId));
    } else {
      setSelected([...selected, member]);
    }
  };

  const removeMember = (memberToRemove: Members) => {
    setSelected(selected.filter((m) => m.userId !== memberToRemove.userId));
  };

  const handleClose = () => {
    // Check if member has changed
    const hasChanged = selected.length !== initialSelectedRef.current.length ||
      selected.some(member => 
        !initialSelectedRef.current.some(initialMember => 
          initialMember.userId === member.userId
        )
      ) ||
      initialSelectedRef.current.some(initialMember => 
        !selected.some(member => member.userId === initialMember.userId)
      );

    if (hasChanged) {
      onSelectMember(selected);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
          const selectedMember = filteredMembers[highlightedIndex];
          if (selectedMember) {
            toggleMember(selectedMember);
            setHighlightedIndex(-1);
            setSearchTerm("");
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (searchTerm) {
          setSearchTerm("");
          setHighlightedIndex(-1);
        } else {
          handleClose();
        }
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bg-white dark:bg-[#242424] rounded-lg shadow-xl border border-gray-200 dark:border-[#343434] w-[260px] max-h-[350px] overflow-hidden z-50"
      data-modal="member-selection"
    >
      <div className="flex flex-col h-full max-h-[333px]">
        
        {/* Selected Members and Search Input */}
        <div className="flex-shrink-0 max-h-[240px] overflow-auto border-b border-gray-200 dark:border-[#343434]">
          <div className="">
            <div className="bg-gray-100 flex-shrink-0 max-h-[240px] overflow-auto dark:bg-[#2c2c2c] p-1 min-h-[28px] cursor-text">
              {/* Selected Member */}
              {selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-1">
                  {selected.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center px-2 py-1 text-sm "
                    >
                      <div className="flex items-center mr-2">
                        <div className="w-5 h-5 rounded-full bg-white dark:bg-[#2c2c2c] flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 border border-gray-300 dark:border-[#3c3c3c]">
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-gray-900 dark:text-gray-100 truncate max-w-[100px]">
                        {member.userName}
                      </span>
                      <button
                        onClick={() => removeMember(member)}
                        className="ml-1.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2c2c2c] transition-colors"
                        aria-label="Remove"
                      >
                        <svg 
                          viewBox="0 0 8 8" 
                          className="w-2 h-2 opacity-50 hover:opacity-100"
                          fill="currentColor"
                        >
                          <polygon points="8 1.01818182 6.98181818 0 4 2.98181818 1.01818182 0 0 1.01818182 2.98181818 4 0 6.98181818 1.01818182 8 4 5.01818182 6.98181818 8 8 6.98181818 5.01818182 4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search Input */}
              <div className="flex items-center px-1 mt-1">
                <Search size={14} className="text-gray-400 mx-0.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[60px] p-1 px-2 bg-transparent rounded-md outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-grow min-h-0 overflow-auto">
          <div className="p-1">
            <div className="flex items-center justify-between px-2 mt-1.5 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <p className="m-0">Select Members</p>
            </div>

            <div 
              ref={memberListRef}
              className="space-y-0.5"
            >
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => {
                  const isSelected = selected.some((m) => m.userId === member.userId);
                  const isHighlighted = index === highlightedIndex;
                  
                  return (
                    <div
                      key={member.userId}
                      onClick={() => toggleMember(member)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full p-2 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                        isHighlighted 
                          ? "bg-gray-100 dark:bg-[#2c2c2c]" 
                          : "hover:bg-gray-100 dark:hover:bg-[#2c2c2c]"
                      }`}
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
                  );
                })
              ) : (
                <div className="flex justify-center items-center text-gray-500 p-4 text-sm">
                  {searchTerm ? `No members found for "${searchTerm}"` : "No Members"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}