"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, MoreVertical, X, HelpCircle, User, ChevronDown, Plus, CheckCircle, Users, Lock, Circle } from "lucide-react";
import { useSettingsModal } from "@/contexts/settingsModalContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import Image from "next/image";
import WorkAreaRow from "../components/WorkAreaRow";
import { WorkArea } from "@/types/workarea";

export default function WorkAreasContent() {
  const {
    defaultTeamspaces,
    setDefaultTeamspaces,
    updateDefaultTeamspaces,
    limitCreationToOwners,
    toggleLimitCreationToOwners,
    teamspaceSearchQuery,
    setTeamspaceSearchQuery,
    teamspaceFilters,
    setTeamspaceFilters,
  } = useSettingsModal();
  const { currentWorkspace, workspaceMembers } = useWorkspaceContext();
  const { workAreas, isLoading, createWorkspaceWorkArea, updateWorkspaceWorkArea } = useWorkAreaContext();
  const { user } = useAuth();

  const [editingWorkAreaId, setEditingWorkAreaId] = useState<string | null>(null);
  const [newWorkAreaId, setNewWorkAreaId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savingWorkAreaId, setSavingWorkAreaId] = useState<string | null>(null);
  
  // Filter dropdown states
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const ownerFilterRef = useRef<HTMLButtonElement>(null);
  const accessFilterRef = useRef<HTMLButtonElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!openFilterDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const refs = [ownerFilterRef, accessFilterRef];
      const clickedInside = refs.some(ref => ref.current?.contains(target));
      
      if (!clickedInside) {
        setOpenFilterDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [openFilterDropdown]);

  // Filter work areas
  const filteredWorkAreas = workAreas.filter((workArea) => {
    // Search filter
    if (teamspaceSearchQuery) {
      const query = teamspaceSearchQuery.toLowerCase();
      if (!workArea.name.toLowerCase().includes(query)) return false;
    }

    // Owner filter
    if (teamspaceFilters.owner) {
      const owner = workArea.members?.find((m) => m.role === "owner");
      if (owner?.userEmail !== user?.email) return false;
    }

    // Access filter
    if (teamspaceFilters.access && teamspaceFilters.access !== "all") {
      if (workArea.accessLevel !== teamspaceFilters.access.toLowerCase()) return false;
    }

    return true;
  });

  // Get unique access levels from work areas
  const accessLevels = Array.from(new Set(workAreas.map(wa => wa.accessLevel)));

  // Helper function to get dropdown position
  const getDropdownPosition = (buttonRef: React.RefObject<HTMLButtonElement>) => {
    if (!buttonRef.current) return { top: 0, left: 0, width: 200 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(180, rect.width),
    };
  };

  // Handle create work area
  const handleCreateWorkArea = async () => {
    if (!currentWorkspace?._id) return;

    // Create a temporary work area for inline editing
    const tempId = `temp-${Date.now()}`;
    setNewWorkAreaId(tempId);
    setEditingWorkAreaId(tempId);
  };

  // Handle save new work area
  const handleSaveNewWorkArea = async (name: string) => {
    if (!name.trim() || isSaving) {
      if (!name.trim()) {
        setNewWorkAreaId(null);
        setEditingWorkAreaId(null);
      }
      return;
    }

    const tempId = newWorkAreaId;
    setIsSaving(true);
    setSavingWorkAreaId(tempId);
    
    try {
      const newWorkArea = await createWorkspaceWorkArea(name.trim());
      if (newWorkArea) {
        setNewWorkAreaId(null);
        setEditingWorkAreaId(null);
        setRefreshKey((prev) => prev + 1);
      }
    } finally {
      setIsSaving(false);
      setSavingWorkAreaId(null);
    }
  };

  // Handle cancel new work area
  const handleCancelNewWorkArea = () => {
    setNewWorkAreaId(null);
    setEditingWorkAreaId(null);
  };

  // Handle save work area edit
  const handleSaveWorkAreaEdit = async (workAreaId: string, name: string) => {
    if (!name.trim() || isSaving) {
      if (!name.trim()) {
        setEditingWorkAreaId(null);
      }
      return;
    }

    // Find the existing work area to preserve its properties
    const existingWorkArea = workAreas.find((wa) => wa._id === workAreaId || String(wa._id) === workAreaId);
    if (!existingWorkArea) {
      setEditingWorkAreaId(null);
      return;
    }

    setIsSaving(true);
    setSavingWorkAreaId(workAreaId);
    
    try {
      await updateWorkspaceWorkArea(
        workAreaId,
        name.trim(),
        undefined, // description
        undefined, // icon
        existingWorkArea.accessLevel || "open"
      );
      setEditingWorkAreaId(null);
      setRefreshKey((prev) => prev + 1);
    } finally {
      setIsSaving(false);
      setSavingWorkAreaId(null);
    }
  };

  // Handle cancel work area edit
  const handleCancelWorkAreaEdit = () => {
    setEditingWorkAreaId(null);
  };

  // Handle start edit
  const handleStartEdit = (workAreaId: string) => {
    setEditingWorkAreaId(workAreaId);
  };

  const handleRemoveDefaultWorkArea = (workAreaId: string) => {
    const updated = defaultTeamspaces.filter((id) => id !== workAreaId);
    setDefaultTeamspaces(updated);
  };

  const handleAddDefaultWorkArea = (workAreaId: string) => {
    if (!defaultTeamspaces.includes(workAreaId)) {
      const updated = [...defaultTeamspaces, workAreaId];
      setDefaultTeamspaces(updated);
    }
  };

  // Combine existing work areas with new work area if creating
  const workAreasToShow = [...filteredWorkAreas];
  if (newWorkAreaId) {
    workAreasToShow.unshift({
      _id: newWorkAreaId,
      name: "",
      workspaceId: currentWorkspace?._id ? String(currentWorkspace._id) : "",
      orgDomain: "",
      accessLevel: "open",
      ownerId: "",
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "",
      groupAccess: [],
      requests: [],
    } as WorkArea);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
        Work Area settings
      </div>

      {/* Help link */}
      <div className="pt-1.5 pb-5">
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="flex text-current no-underline select-none cursor-pointer ml-[-6px]"
        >
          <div
            role="button"
            tabIndex={0}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center gap-1 h-6 px-1.5 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-500 dark:text-zinc-400"
          >
            <HelpCircle className="w-4 h-4 block fill-current flex-shrink-0" />
            <div className="whitespace-nowrap overflow-hidden text-ellipsis">Learn about work areas</div>
          </div>
        </a>
      </div>

      {/* Default work areas section */}
      <div>
        <div className="text-sm mb-0.5">Default work areas</div>
        <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400">
          Choose work areas that all new and current workspace members will automatically join
        </div>
        <div className="pt-3 flex">
          <div className="flex-grow">
            <div className="flex flex-col items-stretch flex-1 min-w-0">
              <div className="flex flex-wrap items-start bg-zinc-50 dark:bg-zinc-800 cursor-text overflow-auto text-sm min-h-7 p-1 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <div className="flex flex-wrap flex-grow min-w-0">
                  {defaultTeamspaces.map((workAreaId) => {
                    const workArea = workAreas.find((t) => t._id === workAreaId || String(t._id) === workAreaId);
                    if (!workArea) return null;
                    return (
                      <div
                        key={workAreaId}
                        className="flex items-center flex-shrink-0 min-w-0 max-w-full h-5 m-0 mr-1.5 mb-1.5 rounded px-1.5 leading-[120%] text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 ml-1.5"
                      >
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis inline-flex items-center h-5 leading-5">
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                            <div className="flex items-center">
                              <div className="flex items-center justify-center h-3.5 w-3.5 rounded-[0.25em] flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 mr-1">
                                <div className="text-[10px] leading-none">
                                  {workArea.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              {workArea.name}
                            </div>
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveDefaultWorkArea(workAreaId)}
                          className="ml-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center border-none p-0 w-auto bg-transparent text-sm leading-5 flex-1 min-w-[60px] mt-0 mx-0.5 mb-0">
                    <input
                      size={1}
                      placeholder=""
                      type="text"
                      className="text-sm leading-5 border-none bg-transparent w-full block resize-none p-0 h-5 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      onFocus={(e) => {
                        // TODO: Open work area selector
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            aria-disabled={defaultTeamspaces.length === 0}
            role="button"
            tabIndex={defaultTeamspaces.length > 0 ? 0 : -1}
            onClick={updateDefaultTeamspaces}
            disabled={defaultTeamspaces.length === 0}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer opacity-40 disabled:cursor-default inline-flex items-center h-[35px] px-3 rounded-md whitespace-nowrap text-sm justify-center flex-shrink-0 bg-blue-600 dark:bg-blue-500 text-white fill-white leading-[1.2] font-medium ml-2.5 disabled:opacity-40"
          >
            Update
          </button>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center justify-center pointer-events-none w-full h-[34px] flex-shrink-0">
        <div
          role="separator"
          className="w-full h-px visible border-b border-zinc-300 dark:border-zinc-600"
        />
      </div>

      {/* Limit creation toggle */}
      <div className="flex items-center cursor-pointer">
        <div className="text-sm mr-2 flex-grow">
          Limit work area creation to only workspace owners
          <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mt-0.5 w-[80%]">
            Only allow workspace owners to create work areas
          </div>
        </div>
        <div className="mt-1.25">
          <div className="relative flex-shrink-0 flex-grow-0 rounded-[44px]">
            <div
              className={cn(
                "flex flex-shrink-0 h-3.5 w-[26px] rounded-[44px] p-0.5 box-content transition-all duration-200",
                limitCreationToOwners
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              )}
            >
              <div
                className={cn(
                  "w-3.5 h-3.5 rounded-[44px] bg-white transition-all duration-200 ease-out",
                  limitCreationToOwners ? "transform translate-x-3" : "transform translate-x-0"
                )}
              />
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={limitCreationToOwners}
              onChange={(e) => toggleLimitCreationToOwners(e.target.checked)}
              className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center justify-center pointer-events-none w-full h-[34px] flex-shrink-0">
        <div
          role="separator"
          className="w-full h-px visible border-b border-zinc-300 dark:border-zinc-600"
        />
      </div>

      {/* Manage work areas section */}
      <div className="mt-2">
        <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100 flex justify-between items-center gap-2">
          <div className="flex flex-col flex-shrink overflow-hidden">
            Manage work areas
            <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis mt-0.75">
              Manage all work areas you have access to here
            </div>
          </div>
          <button
            role="button"
            tabIndex={0}
            onClick={handleCreateWorkArea}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-8 px-3 rounded-md whitespace-nowrap text-sm justify-center flex-shrink-0 bg-blue-600 dark:bg-blue-500 text-white fill-white leading-[1.2] font-medium hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            New work area
          </button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center mt-5 flex-wrap gap-4 gap-y-1.25">
          <div className="flex items-center w-full text-xs leading-4 relative rounded-full shadow-sm bg-zinc-50 dark:bg-zinc-800 cursor-text pt-1 pb-1 px-2.5 max-w-[250px] mr-auto">
            <div className="mr-1.5">
              <Search className="w-4 h-4 block text-zinc-500 dark:text-zinc-400 flex-shrink-0 mr-0.5 flex-grow-0" />
            </div>
            <input
              placeholder="Search work areas..."
              type="text"
              value={teamspaceSearchQuery}
              onChange={(e) => setTeamspaceSearchQuery(e.target.value)}
              className="text-xs leading-4 border-none bg-transparent w-full block resize-none p-0 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Filters commented out for now */}
          {/* <div className="flex align-stretch flex-wrap gap-4 gap-y-1.25">
            Owner filter
            <div className="rounded-[14px] mr-1.5 inline-flex relative">
              <button
                ref={ownerFilterRef}
                role="button"
                tabIndex={0}
                aria-expanded={openFilterDropdown === "owner"}
                aria-haspopup="dialog"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterDropdown(openFilterDropdown === "owner" ? null : "owner");
                }}
                className={cn(
                  "user-select-none transition-colors duration-200 ease-in cursor-pointer text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full h-6 leading-6 px-2",
                  teamspaceFilters.owner
                    ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Users className="w-4 h-4 block text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
                <span>Owner</span>
                <ChevronDown className="w-3.5 h-3.5 block text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
              </button>
              
              Owner dropdown
              {openFilterDropdown === "owner" && typeof window !== "undefined" && createPortal(
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="fixed z-[10000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md py-1 min-w-[160px]"
                  style={getDropdownPosition(ownerFilterRef)}
                >
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, owner: false });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      !teamspaceFilters.owner
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    <span>All owners</span>
                    {!teamspaceFilters.owner && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, owner: true });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      teamspaceFilters.owner
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <User className="w-4 h-4" />
                    <span>My work areas</span>
                    {teamspaceFilters.owner && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                </div>,
                document.body
              )}
            </div>

            Access filter
            <div className="rounded-[14px] mr-0 inline-flex relative">
              <button
                ref={accessFilterRef}
                role="button"
                tabIndex={0}
                aria-expanded={openFilterDropdown === "access"}
                aria-haspopup="dialog"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterDropdown(openFilterDropdown === "access" ? null : "access");
                }}
                className={cn(
                  "user-select-none transition-colors duration-200 ease-in cursor-pointer text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full h-6 leading-6 px-2",
                  teamspaceFilters.access && teamspaceFilters.access !== "all"
                    ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Lock className="w-4 h-4 block text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
                Access
                <ChevronDown className="w-3.5 h-3.5 block text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
              </button>
              
              Access dropdown
              {openFilterDropdown === "access" && typeof window !== "undefined" && createPortal(
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="fixed z-[10000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md py-1 min-w-[160px]"
                  style={getDropdownPosition(accessFilterRef)}
                >
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, access: "all" });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      (!teamspaceFilters.access || teamspaceFilters.access === "all")
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Circle className="w-4 h-4" />
                    <span>All access</span>
                    {(!teamspaceFilters.access || teamspaceFilters.access === "all") && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, access: "open" });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      teamspaceFilters.access === "open"
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Open</span>
                    {teamspaceFilters.access === "open" && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, access: "closed" });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      teamspaceFilters.access === "closed"
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Closed</span>
                    {teamspaceFilters.access === "closed" && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => {
                      setTeamspaceFilters({ ...teamspaceFilters, access: "private" });
                      setOpenFilterDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2",
                      teamspaceFilters.access === "private"
                        ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                    {teamspaceFilters.access === "private" && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div> */}
        </div>

        {/* Table */}
        <div className="mt-4">
          <div className="h-[300px] min-h-[84px] max-h-[450px] w-full flex flex-col min-w-[552px]">
            {/* Header */}
            <div className="flex relative border-t border-b border-zinc-200 dark:border-zinc-700">
              <div className="w-[35%] min-w-[250px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    <div className="text-sm">Work Area</div>
                  </div>
                </div>
              </div>
              <div className="w-[20%] min-w-[120px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    <div className="text-sm">Joined</div>
                  </div>
                </div>
              </div>
              <div className="w-[25%] min-w-[150px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    <div className="text-sm">Owner</div>
                  </div>
                </div>
              </div>
              <div className="w-[15%] min-w-[90px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    <div className="text-sm">Access</div>
                  </div>
                </div>
              </div>
              <div className="w-[10%] min-w-[100px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    <div className="text-sm">Updated</div>
                  </div>
                </div>
              </div>
              <div className="w-[5%] min-w-[60px] px-3 flex items-center h-8">
                <div className="flex items-center">
                  <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400"></div>
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <div 
                key={`workareas-${refreshKey}`}
                className="w-full relative"
                style={{
                  minHeight: `${Math.max(200, (workAreasToShow.length) * 42)}px`
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-sm text-zinc-500 dark:text-zinc-400">
                    Loading work areas...
                  </div>
                ) : workAreasToShow.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-zinc-500 dark:text-zinc-400">
                    {teamspaceSearchQuery ? "No work areas found" : "No work areas"}
                  </div>
                ) : (
                  workAreasToShow.map((workArea, index) => {
                    const isNewWorkArea = workArea._id === newWorkAreaId;
                    const isEditing = editingWorkAreaId === workArea._id;

                    return (
                      <div
                        key={`workarea-${workArea._id || workArea.name || index}-${refreshKey}`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${index * 42}px)`,
                          zIndex: 1,
                        }}
                      >
                        {isNewWorkArea ? (
                          <WorkAreaRow
                            workArea={workArea as any}
                            isEditing={isEditing}
                            onStartEdit={() => handleStartEdit(workArea._id || "")}
                            onSaveEdit={(name) => handleSaveNewWorkArea(name)}
                            onCancelEdit={handleCancelNewWorkArea}
                            index={index}
                            isSaving={isSaving && savingWorkAreaId === workArea._id}
                            isNewWorkArea={true}
                          />
                        ) : (
                          <WorkAreaRow
                            workArea={workArea as any}
                            isEditing={isEditing}
                            onStartEdit={() => handleStartEdit(String(workArea._id || ""))}
                            onSaveEdit={(name) => handleSaveWorkAreaEdit(String(workArea._id || ""), name)}
                            onCancelEdit={handleCancelWorkAreaEdit}
                            index={index}
                            isSaving={isSaving && savingWorkAreaId === String(workArea._id)}
                            isNewWorkArea={false}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
