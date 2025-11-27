"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";

interface RelationConfigModalProps {
  isOpen: boolean;
  selectedViewTitle: string;
  onClose: () => void;
  onConfirm: (config: { propertyName: string; relationLimit: "single" | "multiple"; twoWayRelation: boolean }) => void;
}

export function RelationConfigModal({
  isOpen,
  selectedViewTitle,
  onClose,
  onConfirm,
}: RelationConfigModalProps) {
  const [propertyName, setPropertyName] = useState("Relation");
  const [relationLimit, setRelationLimit] = useState<"single" | "multiple">("multiple");
  const [twoWayRelation, setTwoWayRelation] = useState(false);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const limitMenuRef = useRef<HTMLDivElement>(null);
  const propertyNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (!showLimitMenu) {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, showLimitMenu]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showLimitMenu) {
          setShowLimitMenu(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, showLimitMenu]);

  useEffect(() => {
    if (!showLimitMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (limitMenuRef.current && !limitMenuRef.current.contains(event.target as Node)) {
        setShowLimitMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLimitMenu]);

  useEffect(() => {
    if (isOpen && propertyNameInputRef.current) {
      const id = window.setTimeout(() => {
        propertyNameInputRef.current?.focus();
        propertyNameInputRef.current?.select();
      }, 100);

      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!propertyName.trim()) return;
    onConfirm({ propertyName: propertyName.trim(), relationLimit, twoWayRelation });
  };

  const limitOptions = [
    { value: "multiple" as const, label: "No limit" },
    { value: "single" as const, label: "1 page" },
  ];

  const selectedLimitLabel = limitOptions.find((opt) => opt.value === relationLimit)?.label ?? "No limit";

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="bg-white dark:bg-[#202020] rounded-lg shadow-xl border border-gray-200 dark:border-[#343434] w-[280px]"
    >
      <div className="flex flex-col gap-[1px] relative p-2 pt-1">
        <div className="flex items-center gap-2 w-full select-none min-h-[28px] text-sm px-2 py-1">
          <div className="flex-1 min-w-0">
            <div className="flex">
              <div className="flex items-center w-full text-sm leading-5 relative rounded-md shadow-sm bg-[#f8f8f7] dark:bg-[#2c2c2c] cursor-text px-[10px] h-7 py-[3px]">
                <input
                  ref={propertyNameInputRef}
                  placeholder="Property name"
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className="text-sm leading-5 border-none bg-transparent w-full block resize-none p-0 outline-none text-[#37352f] dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[10px] space-y-1.5">
          <div role="menuitem" tabIndex={0} className="select-none transition-colors duration-20 w-full flex rounded-md text-[#37352f] dark:text-gray-100 hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c]">
            <div className="flex items-center gap-2 w-full select-none min-h-[28px] text-sm px-2">
              <div className="flex items-center justify-center min-w-5 min-h-5">
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 block fill-[#37352f] dark:fill-gray-100 flex-shrink-0">
                  <path d="M18.507 11.112c.362 0 .655.293.655.656v4.369a.656.656 0 0 1-1.311 0V13.35l-4.997 4.997a.655.655 0 1 1-.927-.928l4.997-4.997h-2.786a.655.655 0 1 1 0-1.31z"></path>
                  <path d="M15.5 4.125c1.174 0 2.125.951 2.125 2.125v3.612h-1.25v-.987h-5.75v2.25h1.72a2 2 0 0 0-.103.448l-.01.195.01.195q.024.214.091.412h-1.708v2.25h2.33l-1.25 1.25H4.5a2.125 2.125 0 0 1-2.125-2.125v-7.5c0-1.174.951-2.125 2.125-2.125zM3.625 13.75c0 .483.392.875.875.875h4.875v-2.25h-5.75zm0-2.625h5.75v-2.25h-5.75zm.875-5.75a.875.875 0 0 0-.875.875v1.375h5.75v-2.25zm6.125 2.25h5.75V6.25a.875.875 0 0 0-.875-.875h-4.875z"></path>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div>Related to</div>
              </div>
              <div className="min-w-0 flex-shrink flex items-center text-[#9b9a97] dark:text-gray-400">
                <div className="whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                  <div className="flex items-center justify-center h-5 w-5 rounded-[0.25em] flex-shrink-0 ">
                    <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-4 h-4 block fill-[#9b9a97] dark:fill-gray-400 flex-shrink-0">
                      <path d="M10 2.375c-1.778 0-3.415.256-4.63.69-.604.216-1.138.488-1.532.82-.391.331-.713.784-.713 1.347q0 .157.032.304h-.032v9.232c0 .563.322 1.016.713 1.346.394.333.928.605 1.532.82 1.215.435 2.852.691 4.63.691s3.415-.256 4.63-.69c.604-.216 1.138-.488 1.532-.82.391-.331.713-.784.713-1.347V5.536h-.032q.031-.147.032-.304c0-.563-.322-1.016-.713-1.346-.394-.333-.928-.605-1.532-.82-1.215-.435-2.852-.691-4.63-.691M4.375 5.232c0-.053.028-.188.27-.391.238-.201.62-.41 1.146-.599 1.047-.374 2.535-.617 4.209-.617s3.162.243 4.21.617c.526.188.907.398 1.146.599.24.203.269.338.269.391s-.028.188-.27.391c-.238.202-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.397-1.146-.599-.24-.203-.269-.338-.269-.39m11.25 1.718V10c0 .053-.028.188-.27.391-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391V6.95c.297.17.633.32.995.45 1.215.433 2.852.69 4.63.69s3.415-.257 4.63-.69c.362-.13.698-.28.995-.45m-11.25 7.818v-3.05c.297.17.633.32.995.449 1.215.434 2.852.69 4.63.69s3.415-.256 4.63-.69c.362-.13.698-.279.995-.45v3.05c0 .054-.028.189-.27.392-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391"></path>
                    </svg>
                  </div>
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis inline break-words ml-1">
                    {selectedViewTitle}
                  </div>
                </div>
                {/* <ChevronRight className="w-4 h-4 ml-1.5 flex-shrink-0" /> */}
              </div>
            </div>
          </div>

          <div
            role="menuitem"
            tabIndex={0}
            aria-expanded={showLimitMenu}
            aria-haspopup="dialog"
            className="select-none transition-colors duration-20 cursor-pointer w-full flex rounded-md text-[#37352f] dark:text-gray-100 relative hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c]"
            onClick={() => setShowLimitMenu((prev) => !prev)}
          >
            <div className="flex items-center gap-2 w-full select-none min-h-[28px] text-sm px-2">
              <div className="flex items-center justify-center min-w-5 min-h-5">
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 block fill-[#37352f] dark:fill-gray-100 flex-shrink-0">
                  <path d="M8.793 6.767c-.816 0-1.472.465-1.71 1.036a.625.625 0 1 1-1.154-.482C6.38 6.242 7.52 5.517 8.794 5.517c1.618 0 3.068 1.181 3.068 2.786a2.62 2.62 0 0 1-.762 1.835l-3.312 3.095h3.637a.625.625 0 1 1 0 1.25h-5.22a.625.625 0 0 1-.427-1.081l4.453-4.163a1.37 1.37 0 0 0 .381-.936c0-.775-.742-1.536-1.818-1.536m7.576 0c-.868 0-1.508.425-1.724.877a.625.625 0 0 1-1.127-.54c.473-.99 1.629-1.587 2.85-1.587.799 0 1.546.247 2.107.675.56.429.962 1.066.962 1.819s-.401 1.39-.962 1.819l-.036.026q.085.056.165.116c.595.448 1.02 1.114 1.02 1.902s-.425 1.454-1.02 1.903c-.595.448-1.388.706-2.236.706-1.287 0-2.488-.6-3.008-1.6a.625.625 0 1 1 1.108-.577c.252.484.952.927 1.9.927.602 0 1.125-.185 1.484-.455.358-.27.522-.595.522-.904 0-.308-.164-.634-.522-.904-.359-.27-.882-.455-1.484-.455h-.554a.625.625 0 0 1 0-1.25h.44a1 1 0 0 1 .114-.01c.549 0 1.023-.17 1.348-.419.323-.247.47-.544.47-.825s-.147-.579-.47-.826c-.325-.247-.8-.418-1.348-.418M3.731 6.22l.005.078v7.56a.625.625 0 0 1-1.25 0V7.21l-1.182.658a.625.625 0 0 1-.608-1.092L2.806 5.6a.625.625 0 0 1 .925.62"></path>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div>Limit</div>
              </div>
              <div className="min-w-0 flex-shrink-0 flex items-center text-[#9b9a97] dark:text-gray-400">
                <div className="whitespace-nowrap overflow-hidden text-ellipsis flex">{selectedLimitLabel}</div>
                <ChevronRight
                  className={`w-4 h-4 ml-1.5 flex-shrink-0 transition-transform duration-200 cursor-pointer ${showLimitMenu ? "rotate-90" : "rotate-0"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLimitMenu((prev) => !prev);
                  }}
                />
              </div>
            </div>

            {showLimitMenu && (
              <div
                ref={limitMenuRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#202020] border border-gray-200 dark:border-[#343434] rounded-md shadow-lg z-10 min-w-full"
              >
                {limitOptions.map((option) => (
                  <div
                    key={option.value}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => {
                      setRelationLimit(option.value);
                      setShowLimitMenu(false);
                    }}
                    className="select-none transition-colors duration-20 cursor-pointer w-full flex rounded-md p-2 text-[#37352f] dark:text-gray-100 hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c] text-sm"
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            role="menuitemcheckbox"
            tabIndex={0}
            onClick={() => setTwoWayRelation((prev) => !prev)}
            className="select-none transition-colors duration-20 cursor-pointer w-full flex rounded-md hover:bg-[#f3f2ef] dark:hover:bg-[#2c2c2c]"
          >
            <div className="flex items-center gap-2 w-full select-none min-h-[28px] text-sm px-2">
              <div className="flex items-center justify-center min-w-5 min-h-5">
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 block fill-[#37352f] dark:fill-gray-100 flex-shrink-0">
                  <path d="M5.393 6.022a.625.625 0 0 1 0 .884L2.924 9.375h5.662a.625.625 0 1 1 0 1.25H2.924l2.469 2.469a.625.625 0 0 1-.884.883L.974 10.442a.625.625 0 0 1 0-.884l3.535-3.536a.625.625 0 0 1 .884 0m6.026 3.353a.625.625 0 1 0 0 1.25h5.648l-2.469 2.469a.625.625 0 1 0 .884.883l3.535-3.535a.625.625 0 0 0 0-.884l-3.535-3.536a.625.625 0 0 0-.884.884l2.469 2.469z"></path>
                </svg>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden inline-flex">
                <div className="whitespace-nowrap overflow-hidden text-ellipsis inline-flex">
                  <div className="flex items-center whitespace-pre">
                    Two-way relation
                  </div>
                </div>
              </div>
              <div className="ml-auto min-w-0 flex-shrink-0">
                <div className="relative flex-shrink-0 flex-grow-0 rounded-[44px]">
                  <div
                    className={`flex flex-shrink-0 h-[14px] w-[26px] rounded-[44px] p-0.5 box-content transition-all duration-200 ${
                      twoWayRelation ? "bg-[#0b85ff]" : "bg-[#d1d1d0]"
                    }`}
                  >
                    <div
                      className={`w-[14px] h-[14px] rounded-[44px] bg-white transition-all duration-200 ${
                        twoWayRelation ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    tabIndex={-1}
                    checked={twoWayRelation}
                    onChange={() => setTwoWayRelation((prev) => !prev)}
                    className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={handleConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleConfirm();
              }
            }}
            className="select-none transition-colors duration-100 cursor-pointer flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm justify-center flex-shrink-0 bg-[#0b85ff] text-white fill-white leading-[1.2] font-medium mt-1.5 mx-3 mb-0 hover:bg-[#0066cc]"
          >
            Add relation
          </div>
        </div>
      </div>
    </div>
  );
}
