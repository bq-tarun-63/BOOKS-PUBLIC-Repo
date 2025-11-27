"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  section: string;
}

interface SidebarTabListProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function SidebarTabList({ tabs, activeTab, onTabChange, className }: SidebarTabListProps) {
  const tabsBySection = tabs.reduce((acc, tab) => {
    const section = tab.section;
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section]!.push(tab);
    return acc;
  }, {} as Record<string, TabItem[]>);

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
      {Object.entries(tabsBySection).map(([section, sectionTabs]) => (
        <div key={section} className="flex flex-col gap-1">
          <div className="text-xs leading-none text-zinc-500 dark:text-zinc-400 font-medium flex items-center h-7 px-2">
            {section}
          </div>
          <div className="flex flex-col gap-0.5" role="tablist">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={`user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center justify-between px-2 py-0 rounded-md h-7 relative ${
                    isActive ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  <div className="flex items-center font-medium leading-none min-w-0">
                    <div
                      className={`w-6 h-6 mr-2 flex-shrink-0 flex items-center justify-center self-center leading-none ${
                        isActive ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center overflow-hidden">
                        <Icon className="w-full h-full block flex-shrink-0" />
                      </div>
                    </div>
                    <div
                      className={`text-sm leading-5 whitespace-nowrap overflow-hidden text-ellipsis font-medium ${
                        isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {tab.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
