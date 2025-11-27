"use client";

import {
    Tag,
    ListChecks,
    Hash,
    Text,
    User,
    Calendar,
    CheckSquare,
    Star,
    Calculator,
    Link2,
    BarChart3,
    GitPullRequest,
    Mail,
    Link,
    Phone,
    Paperclip,
  } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { DropdownMenuSearch, DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
  
export const PROPERTY_TYPES = [
    { type: "text", label: "Text", icon: Text },
    { type: "select", label: "Select", icon: Tag },
    { type: "multi_select", label: "Multi-Select", icon: ListChecks },
    { type: "status", label: "Status", icon: Tag },
    { type: "person", label: "Person", icon: User },
    { type: "date", label: "Date", icon: Calendar },
    { type: "checkbox", label: "Checkbox", icon: CheckSquare },
    { type: "priority", label: "Priority", icon: Star },
    { type: "number", label: "Number", icon: Hash },
    { type: "relation", label: "Relation", icon: Link2 },
    { type: "rollup", label: "Rollup", icon: BarChart3 },
    { type: "formula", label: "Formula", icon: Calculator },
    { type: "github_pr", label: "GitHub PR", icon: GitPullRequest },
    { type: "email", label: "Email", icon: Mail },
    { type: "url", label: "URL", icon: Link },
    { type: "phone", label: "Phone", icon: Phone },
    { type: "file", label: "File / Media", icon: Paperclip },
];
  
  interface AddPropertyDialogProps {
    onSelect: (type: string, options?: any) => Promise<{ id: string; name: string } | null> | void; 
    onClose: () => void;
  }
  
  export function AddPropertyDialog({ onSelect, onClose }: AddPropertyDialogProps) {
    const [loadingType, setLoadingType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        // Check if click is outside the dropdown
        if (dropdownRef.current && !dropdownRef.current.contains(target)) {
          // Check if click is on a button (like back button) - don't close in that case
          const element = target as HTMLElement;
          if (element.closest('button') && element.closest('button')?.getAttribute('aria-label') === 'Back') {
            return; // Don't close if clicking back button
          }
          // Check if click is within the parent modal container
          const parentModal = dropdownRef.current.closest('[data-modal-container]');
          if (parentModal && parentModal.contains(target)) {
            return; // Don't close if click is within parent modal
          }
          onClose();
        }
      };

      // Handle escape key to close dropdown
      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      // Add event listeners
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);

      // Cleanup event listeners
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }, [onClose]);


    // Filter properties based on search query
    const filteredProperties = PROPERTY_TYPES.filter(prop =>
      prop.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reset selected index when search query changes
    useEffect(() => {
      setSelectedIndex(-1);
    }, [searchQuery]);

    // Handle keyboard navigation for search input
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(0);
        // Focus the menu container
        const menuElement = dropdownRef.current?.querySelector('[role="menu"]') as HTMLElement;
        menuElement?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    // Handle keyboard navigation for menu
    const handleMenuKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProperties.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProperties.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredProperties.length) {
          const selectedProp = filteredProperties[selectedIndex];
          if (selectedProp) {
            handleSelect(selectedProp);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleSelect = async (prop: typeof PROPERTY_TYPES[0]) => {
        setLoadingType(prop.type);

        try {
          // For relation type, don't create property yet - let parent handle view selection first
          if (prop.type === "relation") {
            // Pass a special flag to indicate relation was selected
            await onSelect(prop.type, { showViewSelector: true });
          } else {
            await onSelect(prop.type);
            onClose();
          }
        } catch (err) {
          console.error("Failed to add property:", err);
          setLoadingType(null);
        }
      };

    // Build menu items array
    const menuItems: DropdownMenuItemProps[] = useMemo(() => {
      return filteredProperties.map((prop, index) => {
        const Icon = prop.icon;
        const isLoading = loadingType === prop.type;
        const isSelected = selectedIndex === index;

        return {
          id: prop.type,
          label: prop.label,
          icon: <Icon size={16} className="h-4 w-4 text-muted-foreground" />,
          onClick: () => handleSelect(prop),
          disabled: isLoading,
          className: isSelected ? "bg-gray-100 dark:bg-[#2c2c2c]" : "",
        };
      });
    }, [filteredProperties, loadingType, selectedIndex]);

       return (
         <div 
           ref={dropdownRef}
           className="relative z-50 w-64 bg-white dark:bg-[#242424] rounded-md overflow-hidden"
         >
           {/* Search */}
           <div className="px-3 py-2 border-b border-gray-100 dark:border-[#3c3c3c] dark:bg-[#2c2c2c]">
             <DropdownMenuSearch
               placeholder="Search properties..."
               value={searchQuery}
               onChange={setSearchQuery}
               onKeyDown={handleSearchKeyDown}
               autoFocus={true}
               variant="subtle"
               className="bg-transparent border-none"
             />
           </div>
           
           {/* Property List */}
           <div 
             className="p-1 max-h-80 overflow-y-auto focus:outline-none focus-visible:outline-none focus-visible:ring-0"
             role="menu"
             tabIndex={0}
             onKeyDown={handleMenuKeyDown}
           >
             {filteredProperties.length > 0 ? (
               <DropdownMenu items={menuItems} />
             ) : (
               <div className="px-3 py-4 text-center">
                 <p className="text-xs text-gray-500 dark:text-gray-400">No properties found</p>
               </div>
             )}
           </div>
         </div>
       );
      
  }
