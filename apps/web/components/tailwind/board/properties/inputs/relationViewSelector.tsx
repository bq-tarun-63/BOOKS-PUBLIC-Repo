"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MoreHorizontal } from "lucide-react";

interface RelationViewSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (viewId: string, viewTitle: string) => void;
  views?: any[];
  loading?: boolean;
}

export function RelationViewSelector({
  isOpen,
  onClose,
  onSelectView,
  views: providedViews = [],
  loading = false,
}: RelationViewSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const filteredViews = providedViews.filter((view: any) =>
    view.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedFilteredViews = showMore ? filteredViews : filteredViews.slice(0, 7);
  const remainingFilteredCount = filteredViews.length - 7;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="w-[280px] min-h-[300px] rounded-[10px] border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#202020]"
    >
      {/* Input section */}
      <div className="flex flex-col gap-px px-1 pt-2 pb-1 relative">
        <div className="flex items-center gap-2 text-sm leading-[1.2] w-full select-none min-h-[28px] px-2 py-1">
          <div className="flex-1 min-w-0">
            <div className="flex">
              <div className="flex items-center w-full text-sm leading-5 relative rounded-md shadow-sm bg-[#f8f8f7] dark:bg-[#2c2c2c] cursor-text px-2.5 h-7 py-[3px]">
                <input
                  ref={searchInputRef}
                  placeholder="Link to a data source…"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm leading-5 border-none bg-transparent w-full block resize-none p-0 outline-none text-[#37352f] dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu content */}
      <div tabIndex={0} role="menu" className="rounded-[10px]">
        {/* Suggested section */}
        <div className="flex flex-col gap-px p-1 relative">
          <div className="flex px-2 mt-1.5 mb-2 text-[12px] font-medium leading-[1.2] text-[#787774] dark:text-[#8a8a88] select-none">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis">Suggested</div>
            <div className="ml-auto">
              {loading && providedViews.length === 0 && (
                <span
                  role="progressbar"
                  aria-live="polite"
                  aria-busy="true"
                  aria-label="Loading..."
                  className="inline-block h-4 w-4 relative pointer-events-none text-[#787774] dark:text-[#8a8a88]"
                >
                  <span className="absolute inset-0 rounded-full border border-[#0000001a]" />
                  <span className="absolute inset-0 rounded-full border-t border-r border-current border-b-transparent border-l-transparent animate-spin" />
                </span>
              )}
            </div>
          </div>

          {/* Skeleton loading */}
          {loading && providedViews.length === 0 && (
            <div className="space-y-2 p-2">
              <div className="h-11 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-11 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-11 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-11 w-3/4 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
            </div>
          )}

          {/* View items */}
          {!loading &&
            (displayedFilteredViews.length > 0 ? (
              displayedFilteredViews.map((view) => (
                <div
                  key={view._id}
                  role="menuitem"
                  tabIndex={-1}
                  className="notranslate flex rounded-md cursor-pointer transition-colors duration-100 hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c]"
                  onClick={() => onSelectView(view._id, view.title)}
                >
                  <div className="flex items-center gap-2 w-full select-none text-sm p-2">
                    <div className="flex items-center justify-center min-w-5 min-h-5 flex-shrink-0">
                      <div className="flex items-center justify-center h-5 w-5 rounded-[0.25em]">
                        <svg
                          aria-hidden="true"
                          role="graphics-symbol"
                          viewBox="0 0 20 20"
                          className="w-5 h-5 block fill-[var(--c-icoSec,#9b9a97)] dark:fill-[#9b9a97] flex-shrink-0"
                        >
                          <path d="M10 2.375c-1.778 0-3.415.256-4.63.69-.604.216-1.138.488-1.532.82-.391.331-.713.784-.713 1.347q0 .157.032.304h-.032v9.232c0 .563.322 1.016.713 1.346.394.333.928.605 1.532.82 1.215.435 2.852.691 4.63.691s3.415-.256 4.63-.69c.604-.216 1.138-.488 1.532-.82.391-.331.713-.784.713-1.347V5.536h-.032q.031-.147.032-.304c0-.563-.322-1.016-.713-1.346-.394-.333-.928-.605-1.532-.82-1.215-.435-2.852-.691-4.63-.691M4.375 5.232c0-.053.028-.188.27-.391.238-.201.62-.41 1.146-.599 1.047-.374 2.535-.617 4.209-.617s3.162.243 4.21.617c.526.188.907.398 1.146.599.24.203.269.338.269.391s-.028.188-.27.391c-.238.202-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.397-1.146-.599-.24-.203-.269-.338-.269-.39m11.25 1.718V10c0 .053-.028.188-.27.391-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391V6.95c.297.17.633.32.995.45 1.215.433 2.852.69 4.63.69s3.415-.257 4.63-.69c.362-.13.698-.28.995-.45m-11.25 7.818v-3.05c.297.17.633.32.995.449 1.215.434 2.852.69 4.63.69s3.415-.256 4.63-.69c.362-.13.698-.279.995-.45v3.05c0 .054-.028.189-.27.392-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="flex items-center gap-1">
                          <div className="notranslate whitespace-nowrap overflow-hidden text-ellipsis">{view.title}</div>
                        </div>
                      </div>
                      {view.description && (
                        <div className="text-[12px] text-[#787774] dark:text-[#9b9a97] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                          <div className="flex text-[12px] text-[#9b9a97] overflow-hidden">
                            <div className="notranslate whitespace-nowrap overflow-hidden text-ellipsis">{view.description}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-2 py-2 text-center text-[12px] text-[#9b9a97]">No views found</div>
            ))}

          {/* Show more button */}
          {!loading && remainingFilteredCount > 0 && !showMore && (
            <div
              role="menuitem"
              tabIndex={-1}
              className="flex rounded-md cursor-pointer text-[#787774] transition-colors duration-100 hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c]"
              onClick={() => setShowMore(true)}
            >
              <div className="flex items-center gap-2 leading-[1.2] w-full select-none min-h-[28px] text-sm px-2">
                <div className="flex items-center justify-center min-w-5 min-h-5">
                  <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">Show {remainingFilteredCount} more</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

