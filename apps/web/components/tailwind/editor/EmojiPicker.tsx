"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  onRemove?: () => void;
  currentEmoji?: string;
  anchorRef?: React.RefObject<HTMLElement>;
  position?: "fixed" | "absolute";
}

export const EMOJI_CATEGORIES = {
  Recent: ["😁"],
  People: [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
    "🫠", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️",
    "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗",
    "🤭", "🫢", "🫣", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑",
    "😶", "🫥", "😶‍🌫️", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌",
    "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
    "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠", "🥳", "🥸", "😎",
    "🤓", "🧐",
  ],
  "Animals & Nature": [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆",
    "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛",
    "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🌸",
    "🌺", "🌻", "🌷", "🌹", "🥀", "🏵️", "🌲", "🌳", "🌴", "🌱",
    "🌿", "☘️", "🍀", "🍃", "🍂", "🍁", "🪴",
  ],
  "Food & Drink": [
    "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒",
    "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕",
    "🌽", "🥒", "🥬", "🫑", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘",
    "🍞", "🥐", "🥖", "🥨", "🧀", "🥚", "🍳", "🥓", "🥞", "🧇",
    "🍗", "🍖", "🍕", "🍔", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙",
    "🧆", "🍿", "🧈", "🧂", "☕", "🍵", "🥤", "🧃", "🧋", "🍺",
  ],
  Activities: [
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
    "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
    "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷",
    "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️",
    "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗",
    "🚴", "🚵", "🎯", "🎮", "🎰", "🎲", "🧩", "♟️", "🎭", "🎨",
  ],
  "Travel & Places": [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
    "🛻", "🚚", "🚛", "🚜", "🛵", "🏍️", "🛺", "🚲", "🛴", "🚏",
    "🛣️", "🛤️", "⛽", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛵",
    "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬",
    "🪂", "💺", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🏠",
    "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫",
  ],
  Objects: [
    "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️",
    "🗜️", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️",
    "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️",
    "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌",
    "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶",
    "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧",
    "📚", "📖", "📝", "✏️", "✒️", "🖊️", "🖋️", "📔", "📕", "📗",
  ],
  Symbols: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
    "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️",
    "⚛️", "🛐", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏",
    "♐", "♑", "♒", "♓", "⛎", "🔀", "🔁", "🔂", "▶️", "⏩",
    "🔥", "⭐", "🌟", "✨", "⚡", "💥", "💫", "🌈", "☀️", "🌙",
  ],
};

export default function EmojiPicker({ onSelect, onClose, onRemove, currentEmoji, anchorRef, position = "fixed" }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Recent");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pickerRef = useRef<HTMLDivElement>(null);

  const filteredEmojis = useMemo(() => {
    if (!searchTerm) return EMOJI_CATEGORIES;
    
    const filtered: Record<string, string[]> = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matches = emojis.filter((emoji) => emoji.includes(searchTerm));
      if (matches.length > 0) {
        filtered[category] = matches;
      }
    });
    return filtered;
  }, [searchTerm]);

  const scrollToCategory = useCallback((category: string) => {
    const element = categoryRefs.current[category];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Calculate position if anchorRef is provided
  const pickerStyle = useMemo(() => {
    if (!anchorRef?.current || !pickerRef.current) {
      return {};
    }

    const buttonRect = anchorRef.current.getBoundingClientRect();
    const pickerHeight = 390;
    const gap = 8;
    const maxPickerWidth = 408;
    const minPickerWidth = 300;
    
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const spaceRight = window.innerWidth - buttonRect.left;
    const spaceLeft = buttonRect.left;
    
    const showBelow = spaceBelow >= pickerHeight || spaceBelow >= spaceAbove;
    const availableWidth = Math.min(spaceRight, spaceLeft + buttonRect.width);
    const pickerWidth = Math.max(minPickerWidth, Math.min(maxPickerWidth, availableWidth - 16));
    
    let top: number;
    if (showBelow) {
      top = buttonRect.bottom + gap;
    } else {
      top = buttonRect.top - pickerHeight - gap;
    }
    
    let left = buttonRect.left;
    if (spaceRight < pickerWidth) {
      left = buttonRect.right - pickerWidth;
      if (left < gap) {
        left = gap;
      }
    }
    
    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${pickerWidth}px`,
    };
  }, [anchorRef]);

  // Update position on scroll/resize when using anchorRef
  useEffect(() => {
    if (!anchorRef?.current || !pickerRef.current || position !== "fixed") return;

    const updatePosition = () => {
      if (!anchorRef?.current || !pickerRef.current) return;
      
      const buttonRect = anchorRef.current.getBoundingClientRect();
      const pickerHeight = 390;
      const gap = 8;
      const maxPickerWidth = 408;
      const minPickerWidth = 300;
      
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const spaceRight = window.innerWidth - buttonRect.left;
      const spaceLeft = buttonRect.left;
      
      const showBelow = spaceBelow >= pickerHeight || spaceBelow >= spaceAbove;
      const availableWidth = Math.min(spaceRight, spaceLeft + buttonRect.width);
      const pickerWidth = Math.max(minPickerWidth, Math.min(maxPickerWidth, availableWidth - 16));
      
      let top: number;
      if (showBelow) {
        top = buttonRect.bottom + gap;
      } else {
        top = buttonRect.top - pickerHeight - gap;
      }
      
      let left = buttonRect.left;
      if (spaceRight < pickerWidth) {
        left = buttonRect.right - pickerWidth;
        if (left < gap) {
          left = gap;
        }
      }
      
      if (pickerRef.current) {
        pickerRef.current.style.top = `${top}px`;
        pickerRef.current.style.left = `${left}px`;
        pickerRef.current.style.width = `${pickerWidth}px`;
      }
    };

    updatePosition();
    
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef, position]);

  const isPositioned = anchorRef && position === "fixed";
  const backdropClass = isPositioned 
    ? "fixed inset-0 z-[100] bg-black/20 dark:bg-black/40" 
    : "fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 dark:bg-black/40";
  const pickerClass = isPositioned
    ? `${position} z-[101] bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden flex flex-col`
    : "bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden w-[408px] max-w-[calc(100vw-24px)] h-[390px] max-h-[70vh] flex flex-col";

  return (
    <div className={backdropClass} onClick={onClose}>
      <div 
        ref={pickerRef}
        className={pickerClass}
        style={isPositioned ? { ...pickerStyle, height: '390px', maxHeight: '70vh', minWidth: '300px' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-2 overflow-x-auto hide-scrollbar">
          <div className="flex gap-1 py-1.5">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveCategory(category);
                  scrollToCategory(category);
                }}
                className={`px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                  activeCategory === category
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                }`}
              >
                {category}
                {activeCategory === category && (
                  <div className="h-0.5 bg-gray-900 dark:bg-white mt-1" />
                )}
              </button>
            ))}
          </div>
          {currentEmoji && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="px-2 h-7 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Remove
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-md px-2 h-7">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {Object.entries(filteredEmojis).map(([category, emojis]) => (
            <div key={category} 
            className="mb-4"
            ref={(el) => { categoryRefs.current[category] = el }}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2 pt-2">
                {category}
              </div>
              <div className="grid grid-cols-10 gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-2xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

