import { useRef, useState, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { BoardPropertyOption } from "@/types/board";

export function MultiSelectEditModal({
  options,
  selectedValues,
  onClose,
  onSave,
  onAddOption,
}: {
  options: BoardPropertyOption[];
  selectedValues: string[];
  onClose: () => void;
  onSave: (selected: string[], updatedOptions: BoardPropertyOption[]) => void;
  onAddOption?: (name: string) => void;
}) {
  const [localOptions, setLocalOptions] = useState<BoardPropertyOption[]>(options);
  const [selected, setSelected] = useState<string[]>([...selectedValues]);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = localOptions.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const canAddNew =
    search.trim().length > 0 &&
    !localOptions.some((opt) => opt.name.toLowerCase() === search.toLowerCase());

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length ? 0 : -1);
  }, [search, filteredOptions.length]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest("[data-modal='multiselect']")) onClose();
    }
    document.addEventListener("mousedown", handle, true);
    return () => document.removeEventListener("mousedown", handle, true);
  }, [onClose]);

  const toggleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
  };

  const addOption = () => {
    const trimmed = search.trim();
    const newOpt: BoardPropertyOption = { id: Date.now().toString(), name: trimmed };
    setLocalOptions((prev) => [...prev, newOpt]);
    setSelected((prev) => [...prev, trimmed]);
    onAddOption?.(trimmed);
    setSearch("");
    setHighlightedIndex(filteredOptions.length);
  };

  const removeOptionFromList = (id: string) => {
    const optToRemove = localOptions.find((o) => o.id === id);
    if (!optToRemove) return;
    // remove from selected if selected
    setSelected((prev) => prev.filter((v) => v !== optToRemove.name));
    // remove from options list
    setLocalOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredOptions.length) return;
  
    if (e.key === "ArrowDown") {
      setHighlightedIndex((i) => (i + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (canAddNew && search.trim()) {
        addOption();
      } else if (highlightedIndex >= 0) {
        const opt = filteredOptions[highlightedIndex];
        if (opt) {
          toggleSelect(opt.name);
        }
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="absolute top-0 bg-white dark:bg-[#242424] rounded-lg shadow-xl border border-gray-200 dark:border-[#343434] w-[250px] max-h-[300px] overflow-hidden z-50">
      <div
        className=" p-2 "
        data-modal="multiselect"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm m-0 font-medium text-gray-800 dark:text-gray-500">
            Edit multiselect options
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-sm p-1 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-1 px-1">
            {selected.map((v) => (
              <span
                key={v}
                className="inline-flex items-center text-[11px] font-medium bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 max-w-[110px] truncate border border-gray-300 dark:border-gray-600"
                style={{ boxShadow: "0 .5px 1.5px 0 rgba(0,0,0,.04)", lineHeight: "1.2" }}
              >
                <span className="truncate">{v}</span>
                <button
                  className="ml-1 hover:text-gray-500 transition"
                  onClick={() => toggleSelect(v)}
                  aria-label="Remove"
                  tabIndex={-1}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition bg-gray-50 dark:bg-[#2c2c2c]">
        <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or add…"
            className="w-full bg-transparent outline-none text-[12px] placeholder-gray-400 dark:placeholder-gray-500"
            style={{ minWidth: 0, lineHeight: 1.4 }}
          />
        </div>

        {/* Options */}
        <div className="max-h-56 overflow-y-auto px-1">
          {filteredOptions.length === 0 && !canAddNew && (
            <div className="text-xs text-gray-400 py-2 italic">No options</div>
          )}
          {filteredOptions.map((opt, i) => {
            const isSelected = selected.includes(opt.name);
            const isHighlighted = highlightedIndex === i;
            return (
              <div
                key={opt.id}
                className={`flex items-center justify-between cursor-pointer rounded px-2 py-1 transition text-[13px] ${
                  isSelected
                    ? "text-gray-900 dark:text-gray-100 font-semibold"
                    : isHighlighted
                    ? "bg-gray-100 dark:bg-gray-800/70"
                    : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <div
                  className="flex items-center gap-2 flex-1"
                  onClick={() => toggleSelect(opt.name)}
                >
                  {isSelected ? <Check size={13} className="text-gray-500" /> : <span className="w-3" />}
                  <span className="truncate">{opt.name}</span>
                </div>
                {/* Delete button */}
                <button
                  className="text-red-500 text-xs p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => removeOptionFromList(opt.id)}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {canAddNew && (
            <button
              className="w-full flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-semibold rounded px-2 py-2 mt-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              onClick={addOption}
              tabIndex={0}
            >
              <Plus size={12} /> Add “{search.trim()}”
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 pb-1 gap-2">
          <button
            className="px-3 py-1 text-xs rounded bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
            onClick={onClose}
            style={{ fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-xs rounded bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => onSave(selected, localOptions)}
            style={{ fontSize: "12px" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
