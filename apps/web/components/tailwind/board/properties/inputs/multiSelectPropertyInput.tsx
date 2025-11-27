import { useEffect, useRef, useState } from "react";
import { BoardPropertyOption } from "@/types/board";
import EditIcon from "@/components/tailwind/ui/icons/editIcon";
import { Search } from "lucide-react";

interface MultiSelectPropertyInputProps {
  value: string[];
  options: BoardPropertyOption[];
  onChange: (value: string[]) => void;
  onEditOptions: () => void;
}

export function MultiSelectPropertyInput({
  value,
  options,
  onChange,
  onEditOptions,
}: MultiSelectPropertyInputProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus search when open
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  // Auto-scroll to highlighted item
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const list = listRef.current;
      const el = list.children[highlightIndex] as HTMLElement;
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (top < list.scrollTop) {
          list.scrollTop = top;
        } else if (bottom > list.scrollTop + list.clientHeight) {
          list.scrollTop = bottom - list.clientHeight;
        }
      }
    }
  }, [highlightIndex]);

  const toggleOption = (opt: BoardPropertyOption) => {
    const exists = value.includes(opt.name);
    let newValue;
    if (exists) {
      newValue = value.filter(v => v !== opt.name);
    } else {
      newValue = [...value, opt.name];
    }
    onChange(newValue);
  };

  const removeOption = (optName: string) => {
    onChange(value.filter((v) => v !== optName));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      const selected = filteredOptions[highlightIndex];
      if (selected) {
        toggleOption(selected); 
        setSearch("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-[250px]">
    {/* Display field */}
    <div
      className="px-2 py-1.5 flex flex-wrap gap-1.5 items-center hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm group cursor-pointer"
      onClick={() => setOpen(true)}
    >
      {value.length > 0 ? (
        value.map((val) => (
          <span
            key={val}
            className="px-2 py-1 rounded-md text-sm bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            {val}
          </span>
        ))
      ) : (
        <span className="text-gray-500 text-sm">Empty</span>
      )}

      {/* Edit button */}
      <button
        className="absolute right-1.5 px-1 py-1 items-center text-xs rounded-sm bg-white dark:bg-[#202020] dark:text-gray-400 dark:hover:bg-[#3c3c3c] invisible group-hover:visible"
        onClick={(e) => {
          e.stopPropagation();
          onEditOptions();
        }}
      >
        <EditIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
    </div>

    {/* Dropdown modal */}
    {open && (
      <div className="absolute top-0 left-0 bg-white dark:bg-[#242424] rounded-lg shadow-xl border border-gray-200 dark:border-[#343434] w-[260px] max-h-[350px] overflow-hidden z-50">
        <div className="flex flex-col h-full max-h-[333px]">
          {/* Selected options */}
          <div className="flex-shrink-0 max-h-[120px] overflow-auto border-b border-gray-200 dark:border-[#343434] bg-gray-100 dark:bg-[#2c2c2c] p-1">
            {value.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-1">
                {value.map((val) => (
                  <div
                    key={val}
                    className="flex items-center px-2 py-1 text-sm rounded- text-gray-900 dark:text-gray-100"
                  >
                    <span>{val}</span>

                    <button
                        onClick={() => removeOption(val)}
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

            {/* Search bar */}
            <div className="flex items-center px-1 mt-1">
              <Search size={14} className="text-gray-400 mx-0.5" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search options..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-[60px] p-1 px-2 bg-transparent rounded-md outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div ref={listRef} className="flex-grow min-h-0 overflow-auto p-1 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => {
                const isHighlighted = i === highlightIndex;
                const isSelected = value.includes(opt.name);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full px-2 py-2 rounded-md text-sm font-normal cursor-pointer transition-colors text-gray-900 hover:bg-gray-100 dark:hover:bg-[#2c2c2c]`}
                  >
                    {opt.name}
                  </div>
                );
              })
            ) : (
              <div className="flex justify-center items-center text-gray-500 p-4 text-sm">
                {search ? `No options for "${search}"` : "No options"}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>

    );
  }
  