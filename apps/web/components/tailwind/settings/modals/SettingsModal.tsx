"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Sliders, Settings as SettingsIcon, Users, Building2, User, Grid2x2 } from "lucide-react";
// Unused imports (commented tabs): Bell, ArrowUpRightSquare, Shield, CheckCircle2, Sparkles, Globe, Smile, Grid2x2, Download, ArrowUpCircle
import { useSettingsModal } from "@/contexts/settingsModalContext";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { cn } from "@/lib/utils";
import PreferencesContent from "../tabs/PreferencesContent";
import GeneralContent from "../tabs/GeneralContent";
import PeopleContent from "../tabs/PeopleContent";
import WorkAreasContent from "../tabs/WorkAreasContent";
import IntegrationsContent from "../tabs/IntegrationsContent";
import DeleteConfirmationModal from "@/components/tailwind/ui/deleteConfirmationModal";

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  highlight?: boolean;
}

const ACCOUNT_TABS: SettingsTab[] = [
  // { id: "profile", label: "Profile", icon: User, section: "Account" },
];

const USER_TABS: SettingsTab[] = [
  { id: "user_settings", label: "Preferences", icon: Sliders, section: "Account" },
  { id: "integrations", label: "Connections", icon: Grid2x2, section: "Account" },

  // { id: "notifications", label: "Notifications", icon: Bell, section: "Account" },
  // { id: "connected_apps", label: "Connections", icon: ArrowUpRightSquare, section: "Account" },
];

const WORKSPACE_TABS: SettingsTab[] = [
  { id: "settings", label: "General", icon: SettingsIcon, section: "Workspace" },
  { id: "members", label: "People", icon: Users, section: "Workspace" },
  { id: "teams", label: "WorkAreas", icon: Building2, section: "Workspace" },
  // { id: "security", label: "Security", icon: Shield, section: "Workspace" },
  // { id: "identity_provisioning", label: "Identity", icon: CheckCircle2, section: "Workspace" },
  // { id: "ai", label: "Books by Betaque  AI", icon: Sparkles, section: "Workspace" },
  // { id: "public_pages", label: "Public pages", icon: Globe, section: "Workspace" },
  // { id: "custom_emoji", label: "Emoji", icon: Smile, section: "Workspace" },
  // { id: "integrations", label: "Connections", icon: Grid2x2, section: "Workspace" },
  // { id: "imports", label: "Import", icon: Download, section: "Workspace" },
  // { id: "plans", label: "Upgrade plan", icon: ArrowUpCircle, section: "Workspace", highlight: true },
];

const ALL_TABS = [...ACCOUNT_TABS, ...USER_TABS, ...WORKSPACE_TABS];

function SettingsModalContent() {
  const {
    isOpen,
    closeModal,
    activeTab,
    setActiveTab,
    showDeleteWorkspaceModal,
    setShowDeleteWorkspaceModal,
    isDeletingWorkspace,
    confirmDeleteWorkspace,
  } = useSettingsModal();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, closeModal]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const element = target as Element;
      
      // Don't close if click is on MemberActionsMenu or its backdrop
      if (
        element.closest('.member-actions-menu') ||
        element.closest('[data-member-actions-backdrop="true"]') ||
        element.getAttribute('data-member-actions-backdrop') === 'true'
      ) {
        return;
      }
      
      if (modalRef.current && !modalRef.current.contains(target)) {
        closeModal();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const tabsBySection = ALL_TABS.reduce((acc, tab) => {
    const section = tab.section || "Other";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section]!.push(tab);
    return acc;
  }, {} as Record<string, SettingsTab[]>);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <PreferencesContent />; // TODO: Create ProfileContent component
      case "user_settings":
        return <PreferencesContent />;
      case "settings":
        return <GeneralContent />;
      case "members":
        return <PeopleContent />;
      case "teams":
        return <WorkAreasContent />;
      case "integrations":
        return <IntegrationsContent />;
      default:
        return <PreferencesContent />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="relative z-[1] max-h-[715px] rounded-xl overflow-hidden mb-0 w-[1150px] max-w-[calc(100vw-100px)] h-[calc(100vh-100px)] bg-background dark:bg-zinc-900 shadow-xl transform transition-transform duration-200 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-label="Settings & members"
        tabIndex={-1}
      >
        <div className="flex h-full flex-row">
          {/* Sidebar */}
          <div className="h-full bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 w-[240px] overflow-y-auto">
            <div className="flex flex-col justify-between overflow-hidden h-full">
              <div className="flex flex-col justify-between pt-2 pb-2 px-2 gap-0.5 overflow-y-auto">
                {Object.entries(tabsBySection).map(([section, tabs]) => (
                  <div key={section}>
                    <div className="text-xs leading-none mb-0.5 mt-0 text-zinc-500 dark:text-zinc-400 font-medium flex items-center h-7 px-2 text-ellipsis overflow-hidden">
                      {section}
                    </div>
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <div
                          key={tab.id}
                          role="tab"
                          tabIndex={isActive ? 0 : -1}
                          id={`settings-tab-${tab.id}`}
                          data-testid={`settings-tab-${tab.id}`}
                          aria-selected={isActive}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center justify-between px-2 py-0 rounded-md mt-0.5 mb-0 h-7 relative",
                            isActive
                              ? "bg-zinc-200 dark:bg-zinc-700"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          )}
                        >
                          <div className="flex items-center font-medium leading-none">
                            {tab.id === "profile" ? (
                              <div className="w-6 h-6 mr-2 text-zinc-500 dark:text-zinc-400 flex-shrink-0 flex items-center justify-center self-center leading-none">
                                <div className="flex items-center justify-center leading-none">
                                  <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-sm outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                                    <div className="rounded-full w-[22px] h-[22px] flex items-center justify-center select-none opacity-100">
                                      <div className="w-full h-full">
                                        {user?.image ? (
                                          <img
                                            alt={user.name || "User"}
                                            src={user.image}
                                            referrerPolicy="same-origin"
                                            className="block object-cover rounded-full w-full h-full"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center text-xs font-medium">
                                            {user?.name?.charAt(0).toUpperCase() || "U"}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "w-6 h-6 mr-2 flex-shrink-0 flex items-center justify-center self-center leading-none",
                                  isActive
                                    ? "text-zinc-700 dark:text-zinc-300"
                                    : "text-zinc-500 dark:text-zinc-400"
                                )}
                              >
                                <div className="w-5 h-5 flex items-center justify-center overflow-hidden">
                                  <Icon className="w-full h-full block flex-shrink-0" />
                                </div>
                              </div>
                            )}
                            <div
                              className={cn(
                                "text-sm leading-none flex items-center",
                                isActive
                                  ? "text-zinc-900 dark:text-zinc-100"
                                  : tab.highlight
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-zinc-600 dark:text-zinc-400"
                              )}
                            >
                              <div
                                className={cn(
                                  "text-sm leading-5 whitespace-nowrap overflow-hidden text-ellipsis font-medium",
                                  isActive
                                    ? "text-zinc-900 dark:text-zinc-100"
                                    : tab.highlight
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-zinc-600 dark:text-zinc-400"
                                )}
                              >
                                {tab.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            id={`settings-tabpanel-${activeTab}`}
            className="flex-grow relative z-[1] h-full overflow-hidden"
          >
            <div className="flex flex-col w-full h-full bg-background dark:bg-zinc-900">
              <div className="z-[1] flex-grow transform translate-z-0 px-[60px] pt-9 pb-9 overflow-auto">
                {renderTabContent()}
              </div>
              {/* Close Button */}
              <div className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-background dark:bg-zinc-900 z-[10]">
                <button
                  role="button"
                  tabIndex={0}
                  onClick={closeModal}
                  className="user-select-none transition-colors duration-200 ease-in cursor-pointer w-full h-full rounded-full flex justify-center items-center bg-transparent"
                >
                  <X className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DeleteWorkspaceModalPortal() {
  const {
    showDeleteWorkspaceModal,
    setShowDeleteWorkspaceModal,
    isDeletingWorkspace,
    confirmDeleteWorkspace,
  } = useSettingsModal();
  const { currentWorkspace } = useWorkspaceContext();

  if (!showDeleteWorkspaceModal) return null;

  return createPortal(
    <DeleteConfirmationModal
      title="Delete Workspace"
      header="Delete Workspace"
      message={currentWorkspace?.name 
        ? `Are you sure you want to delete the workspace ${currentWorkspace.name}? This action cannot be undone.`
        : "Are you sure you want to delete this workspace? This action cannot be undone."}
      isOpen={showDeleteWorkspaceModal}
      extraMessage="All workspace data, pages, and member information will be permanently deleted"
      isDeleting={isDeletingWorkspace}
      onCancel={() => setShowDeleteWorkspaceModal(false)}
      onConfirm={confirmDeleteWorkspace}
    />,
    document.body
  );
}

export default function SettingsModal() {
  return (
    <>
      <SettingsModalContent />
      <DeleteWorkspaceModalPortal />
    </>
  );
}

