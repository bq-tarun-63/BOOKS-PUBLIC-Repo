import { BoardProperty, BoardPropertyOption } from "@/types/board";
import { X, Plus, Trash2} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import EditIcon from "../icons/editIcon";
import { ObjectId } from "bson";

interface PropertyOptionsModalProps {
  isOpen: boolean;
  options: BoardPropertyOption[];
  onSave: (options: BoardPropertyOption[]) => void;
  onClose: () => void;
  property: BoardProperty;
}

export const PropertyOptionsModal: React.FC<PropertyOptionsModalProps> = ({
  isOpen,
  options,
  onSave,
  onClose,
  property,
}) => {
  const [localOptions, setLocalOptions] = useState<BoardPropertyOption[]>(options);
  const [newOptionName, setNewOptionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<BoardPropertyOption[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newOptionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  // Filter options based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(localOptions);
      return;
    }
    const filtered = localOptions.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, localOptions]);

  // Handle outside clicks - auto save
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Auto save on outside click
        onSave(localOptions);
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, localOptions, onSave, onClose]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleAddOption = () => {
    if (!newOptionName.trim()) return;
    const newOption: BoardPropertyOption = {
      id: `opt_${new ObjectId()}`,
      name: newOptionName.trim(),
    };
    setLocalOptions([...localOptions, newOption]);
    setNewOptionName("");
    
    // Focus back to input for continuous adding
    setTimeout(() => {
      if (newOptionInputRef.current) {
        newOptionInputRef.current.focus();
      }
    }, 0);
  };

  const handleStartEdit = (option: BoardPropertyOption) => {
    setEditingId(option.id);
    setEditingValue(option.name);
  };

  const handleSaveEdit = () => {
    if (!editingValue.trim()) return;
    setLocalOptions(localOptions.map((o) => 
      o.id === editingId ? { ...o, name: editingValue.trim() } : o
    ));
    setEditingId(null);
    setEditingValue("");
  };

  const handleDeleteOption = (id: string) => {
    setLocalOptions(localOptions.filter((o) => o.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingValue("");
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-0 bg-white dark:bg-[#242424] rounded-lg shadow-xl border border-gray-200 dark:border-[#343434] w-[280px] max-h-[400px] overflow-hidden z-50"
    >
      <div className="flex flex-col h-full">
        {/* Header with search */}
        <div className="flex-shrink-0 border-b bg-gray-100 dark:bg-[#2c2c2c] border-gray-200 dark:border-[#343434]">
          <div className="p-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm m-0 font-medium text-gray-800 dark:text-gray-500">
                Edit {property.name} options
              </p>
              <button
                onClick={() => {
                  onSave(localOptions);
                  onClose();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-sm p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className=" border-gray-200 dark:border-[#343434] mb-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition bg-gray-50 dark:bg-[#2c2c2c]">
                <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <input
                  ref={newOptionInputRef}
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Add an option"
                  className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Search input styled like priority input */}
            <div className="bg-gray-100 dark:bg-[#2c2c2c] rounded-md px-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Options list */}
        <div className="flex-grow min-h-0 overflow-auto p-2">
          <div className="space-y-1">
            {filteredOptions.map((opt) => (
              <div
                key={opt.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#2c2c2c] transition"
              >
                {editingId === opt.id ? (
                  <input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder="Option name"
                    className="flex-1 text-sm rounded px-2 py-1 bg-gray-100 dark:bg-[#2c2c2c] text-gray-900 dark:text-gray-100 outline-none border border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditingValue("");
                      }
                    }}
                    onBlur={handleSaveEdit}
                    autoFocus
                  />
                ) : (
                  <>
                    <div className={`px-2 py-0.5 rounded-full text-sm`}>
                      {opt.name}
                    </div>
                    <div className="flex-1" />
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(opt)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Edit option"
                      >
                        <EditIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(opt.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500"
                        title="Delete option"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredOptions.length === 0 && searchTerm && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No options found for "{searchTerm}"
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
