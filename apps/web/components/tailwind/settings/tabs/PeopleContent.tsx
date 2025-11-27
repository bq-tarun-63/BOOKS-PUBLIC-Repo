"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Copy, Check, HelpCircle, ArrowDown, X } from "lucide-react";
import { useSettingsModal } from "@/contexts/settingsModalContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MemberRow from "../components/MemberRow";
import GroupRow from "../components/GroupRow";
import InviteModal from "@/components/tailwind/ui/modals/inviteMemberModal";
import type { WorkspaceGroup } from "@/types/workspace";

type PeopleTab = "members" | "groups" | "contacts";

export default function PeopleContent() {
  const {
    inviteLinkEnabled,
    inviteLink,
    copyInviteLink,
    generateNewInviteLink,
    toggleInviteLink,
    peopleTab,
    setPeopleTab,
    searchQuery,
    setSearchQuery,
  } = useSettingsModal();
  const {
    currentWorkspace,
    workspaceMembers,
    setCurrentWorkspace,
    fetchAllWorkspace,
    workspaceGroups,
    createWorkspaceGroup,
    updateWorkspaceGroup,
  } = useWorkspaceContext();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  // Clear editing state when switching tabs
  useEffect(() => {
    setEditingGroupId(null);
    setNewGroupId(null);
    setSearchQuery("");
  }, [peopleTab, setSearchQuery]);

  // Set members as default tab if not set
  useEffect(() => {
    if (!peopleTab) {
      setPeopleTab("members");
    }
  }, [peopleTab, setPeopleTab]);

  // Get current user's role - check by email and role in members array
  const currentUserMember = workspaceMembers.find(
    (m) => m.userEmail === user?.email
  );
  
  // Find owner by checking member with role "owner"
  const ownerMember = workspaceMembers.find((m) => m.role === "owner");
  const isOwner = ownerMember?.userEmail === user?.email;
  
  // Determine current user's role
  const currentUserRole = isOwner
    ? "owner"
    : (currentUserMember?.role === "admin"
        ? "admin"
        : (currentUserMember?.role === "member"
            ? "member"
            : null));

  // Debug logging 
  if (process.env.NODE_ENV === "development") {
    console.log("PeopleContent Debug:", {
      userEmail: user?.email,
      currentUserMember,
      ownerMember,
      isOwner,
      currentUserRole,
      workspaceMembers: workspaceMembers.map((m) => ({
        email: m.userEmail,
        role: m.role,
      })),
    });
  }

  // Count members (including owner and admins)
  const membersCount = workspaceMembers.filter(
    (m) => m.role !== "guest"
  ).length;
  const groupsCount = workspaceGroups.length;
  const contactsCount = 0; // TODO: Implement contacts



  const handleInviteModalClose = () => {
    setShowInviteModal(false);
  };

  const handleCopyLink = () => {
    copyInviteLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter members based on active tab and search - only compute when on members tab
  const filteredMembers = peopleTab === "members" 
    ? workspaceMembers.filter((member) => {
        // Filter by tab - members tab shows all non-guest members (including owner and admins)
        if (member.role === "guest") return false;

        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            member.userName?.toLowerCase().includes(query) ||
            member.userEmail?.toLowerCase().includes(query)
          );
        }

        return true;
      })
    : [];

  // Filter groups based on search - only compute when on groups tab
  const filteredGroups = peopleTab === "groups"
    ? workspaceGroups.filter((group: WorkspaceGroup) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return group.name?.toLowerCase().includes(query);
      })
    : [];

  // Handle create group
  const handleCreateGroup = async () => {
    if (!currentWorkspace?._id) return;

    // Create a temporary group for inline editing
    const tempId = `temp-${Date.now()}`;
    setNewGroupId(tempId);
    setEditingGroupId(tempId);
  };

  // Handle save new group
  const handleSaveNewGroup = async (name: string) => {
    if (!name.trim()) {
      setNewGroupId(null);
      setEditingGroupId(null);
      return;
    }

    const newGroup = await createWorkspaceGroup(name.trim());
    if (newGroup) {
      setNewGroupId(null);
      setEditingGroupId(null);
      setRefreshKey((prev) => prev + 1);
    }
  };

  // Handle cancel new group
  const handleCancelNewGroup = () => {
    setNewGroupId(null);
    setEditingGroupId(null);
  };

  // Handle save group edit
  const handleSaveGroupEdit = async (groupId: string, name: string) => {
    if (!name.trim()) {
      setEditingGroupId(null);
      return;
    }

    // Find the existing group to preserve its members
    const existingGroup = workspaceGroups.find((g) => g.id === groupId);
    const existingMembers = existingGroup?.members || [];

    await updateWorkspaceGroup(groupId, name.trim(), existingMembers);
    setEditingGroupId(null);
    setRefreshKey((prev) => prev + 1);
  };

  // Handle cancel group edit
  const handleCancelGroupEdit = () => {
    setEditingGroupId(null);
  };

  // Handle start edit
  const handleStartEdit = (groupId: string) => {
    setEditingGroupId(groupId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">People</div>
          <button
            role="button"
            tabIndex={0}
            aria-label="Learn more about inviting people"
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center justify-center flex-shrink-0 rounded-md h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Invite link section */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center">
          <div className="mr-2 flex-grow">
            <div className="border-b-0 mb-0.5 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
              Invite link to add members
            </div>
            <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mt-0 w-[85%]">
              Only people with permission to invite members can see this. You can also{" "}
              <button
                onClick={generateNewInviteLink}
                className="inline text-current underline select-none cursor-pointer"
              >
                generate a new link
              </button>
            </div>
          </div>
          <div className="min-w-[130px]">
            <div className="flex items-center justify-end gap-4">
              <button
                role="button"
                tabIndex={0}
                onClick={handleCopyLink}
                className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy link
                  </>
                )}
              </button>
              <div className="relative flex-shrink-0 flex-grow-0 rounded-[44px]">
                <div
                  className={cn(
                    "flex flex-shrink-0 h-3.5 w-[26px] rounded-[44px] p-0.5 box-content transition-all duration-200",
                    inviteLinkEnabled
                      ? "bg-blue-600 dark:bg-blue-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded-[44px] bg-white transition-all duration-200 ease-out",
                      inviteLinkEnabled ? "transform translate-x-3" : "transform translate-x-0"
                    )}
                  />
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={inviteLinkEnabled}
                  onChange={(e) => toggleInviteLink(e.target.checked)}
                  className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center pointer-events-none w-full h-10 flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px visible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-0.5">
        <div
          className="overflow-auto visible flex w-[calc(100%+12px)] relative text-sm px-1 py-0 z-[1] mt-[-6px] ml-[-12px]"
          role="tablist"
        >
          {/* Members tab - first and default */}
          <div className="py-1.5 whitespace-nowrap min-w-0 flex-shrink-0 text-zinc-900 dark:text-zinc-100 relative">
            <div
              role="tab"
              tabIndex={0}
              aria-selected={peopleTab === "members"}
              onClick={() => setPeopleTab("members")}
              className={cn(
                "user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-base flex-shrink-0 leading-[1.2] min-w-0 font-normal",
                peopleTab === "members"
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400"
              )}
            >
              <div className="flex text-sm font-medium leading-[18px] text-zinc-900 dark:text-zinc-100">
                Members
                <div className="text-sm leading-[18px] pl-1 text-zinc-500 dark:text-zinc-400">
                  {membersCount}
                </div>
              </div>
            </div>
            {peopleTab === "members" && (
              <div className="border-b-2 border-zinc-900 dark:border-zinc-100 absolute bottom-0 inset-x-0" />
            )}
          </div>
          <div className="py-1.5 whitespace-nowrap min-w-0 flex-shrink-0 text-zinc-900 dark:text-zinc-100 relative">
            <div
              role="tab"
              tabIndex={0}
              aria-selected={peopleTab === "groups"}
              onClick={() => setPeopleTab("groups")}
              className={cn(
                "user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-base flex-shrink-0 leading-[1.2] min-w-0 font-normal",
                peopleTab === "groups"
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400"
              )}
            >
              <div className={cn(
                "flex text-sm font-medium leading-[18px]",
                peopleTab === "groups"
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              )}>
                Groups
                <div className="text-sm leading-[18px] pl-1 text-zinc-500 dark:text-zinc-400">
                  {groupsCount}
                </div>
              </div>
            </div>
            {peopleTab === "groups" && (
              <div className="border-b-2 border-zinc-900 dark:border-zinc-100 absolute bottom-0 inset-x-0" />
            )}
          </div>
          <div className="py-1.5 whitespace-nowrap min-w-0 flex-shrink-0 text-zinc-600 dark:text-zinc-400">
            <div
              role="tab"
              tabIndex={0}
              aria-selected={peopleTab === "contacts"}
              onClick={() => setPeopleTab("contacts")}
              className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-base flex-shrink-0 leading-[1.2] min-w-0 text-zinc-500 dark:text-zinc-400 font-normal"
            >
              <div className="flex text-sm font-medium leading-[18px] text-zinc-500 dark:text-zinc-400">
                Contacts
              </div>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-end text-zinc-600 dark:text-zinc-400">
            <div className="flex h-[34px] pb-0 justify-end items-center gap-2.5">
              <div className="flex h-7 justify-end items-center gap-1">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 w-4 h-4 text-zinc-500 dark:text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={peopleTab === "members" ? "Search members..." : peopleTab === "groups" ? "Search groups..." : "Search..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-8 pr-2.5 w-[200px] text-sm bg-transparent border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 w-4 h-4 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {(currentUserRole === "owner" || currentUserRole === "admin") && (
                <div>
                  {peopleTab === "groups" ? (
                    <button
                      role="button"
                      tabIndex={0}
                      onClick={handleCreateGroup}
                      className="user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center justify-center whitespace-nowrap rounded-md px-2 text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 h-7"
                    >
                      Create group
                    </button>
                  ) : (
                    <button
                      role="button"
                      tabIndex={0}
                      aria-expanded={false}
                      aria-haspopup="dialog"
                      onClick={() => setShowInviteModal(true)}
                      className="user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center justify-center whitespace-nowrap rounded-md px-2 text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 h-7"
                    >
                      Add members
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-[-1px] h-full">
        <div className="relative w-full h-full overflow-x-auto" id="groups-table-container">
          <div className="h-[300px] min-h-[84px] max-h-[450px] w-full flex flex-col min-w-[552px]">
            {/* Header */}
            <div className="flex relative shadow-[inset_0_1px_0_var(--c-tabDivCol),inset_0_-1px_0_var(--c-tabDivCol)]">
              {peopleTab === "groups" ? (
                <>
                  <div className="w-[50px] min-w-[50px] px-3 flex items-center h-8">
                    <div className="flex items-center">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        <div className="text-sm"></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[35%] min-w-[250px] px-3 flex items-center h-8">
                    <div className="flex items-center">
                      <button
                        role="button"
                        tabIndex={0}
                        className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-5 px-1.5 rounded whitespace-nowrap text-xs flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 mx-[-6px]"
                      >
                        <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                          <div className="text-sm">Group</div>
                        </div>
                        <ArrowDown className="w-3 h-3 block fill-current flex-shrink-0 text-zinc-600 dark:text-zinc-400 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="w-[20%] min-w-[120px] px-3 flex items-center h-8">
                    <div className="flex items-center pl-2">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        <div className="text-sm">Members</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[25%] min-w-[150px] px-3 flex items-center h-8">
                    <div className="flex items-center pl-2">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        <div className="text-sm">Created</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[10%] min-w-[50px] px-3 flex items-center h-8">
                    <div className="flex items-center">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[35%] min-w-[250px] px-3 flex items-center h-8">
                    <div className="flex items-center">
                      <button
                        role="button"
                        tabIndex={0}
                        className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-5 px-1.5 rounded whitespace-nowrap text-xs flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 mx-[-6px]"
                      >
                        <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                          <div className="text-sm">User</div>
                        </div>
                        <ArrowDown className="w-3 h-3 block fill-current flex-shrink-0 text-zinc-600 dark:text-zinc-400 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="w-[20%] min-w-[120px] px-3 flex items-center h-8">
                    <div className="flex items-center pl-2">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        <div className="text-sm">Role</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[25%] min-w-[150px] px-3 flex items-center h-8">
                    <div className="flex items-center pl-2">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        <div className="text-sm">Groups</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[10%] min-w-[50px] px-3 flex items-center h-8">
                    <div className="flex items-center">
                      <div className="text-xs font-normal text-zinc-600 dark:text-zinc-400"></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <div 
                key={`${peopleTab}-${refreshKey}`}
                className="w-full relative"
                style={{
                  minHeight: peopleTab === "groups" 
                    ? `${Math.max(200, (filteredGroups.length + (newGroupId ? 1 : 0)) * 42)}px`
                    : `${Math.max(84, filteredMembers.length * 42)}px`
                }}
              >
                {peopleTab === "members" ? (
                  filteredMembers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-zinc-500 dark:text-zinc-400">
                      {searchQuery ? "No members found" : "No members"}
                    </div>
                  ) : (
                    filteredMembers.map((member, index) => (
                      <div
                        key={`member-${member.userEmail || member.userId}-${refreshKey}`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${index * 42}px)`,
                        }}
                      >
                        <MemberRow
                          member={member}
                          currentUserEmail={user?.email || null}
                          currentUserRole={currentUserRole}
                          workspaceId={currentWorkspace?._id || ""}
                        />
                      </div>
                    ))
                  )
                ) : peopleTab === "groups" ? (
                  (() => {
                    // Combine existing groups with new group if creating
                    const groupsToShow = [...filteredGroups];
                    if (newGroupId) {
                      groupsToShow.unshift({
                        id: newGroupId,
                        name: "",
                        members: [],
                        createdAt: new Date(),
                      } as WorkspaceGroup);
                    }

                    if (groupsToShow.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full text-sm text-zinc-500 dark:text-zinc-400">
                          {searchQuery ? "No groups found" : "No groups"}
                        </div>
                      );
                    }

                    return groupsToShow.map((group: WorkspaceGroup, index: number) => {
                      const isNewGroup = group.id === newGroupId;
                      const isEditing = editingGroupId === group.id;

                      return (
                        <div
                          key={`group-${group.id || group.name || index}-${refreshKey}`}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${index * 42}px)`,
                            zIndex: 1,
                          }}
                        >
                          {isNewGroup ? (
                            <GroupRow
                              group={group}
                              isEditing={isEditing}
                              onStartEdit={() => handleStartEdit(group.id || "")}
                              onSaveEdit={(name) => handleSaveNewGroup(name)}
                              onCancelEdit={handleCancelNewGroup}
                              index={index}
                            />
                          ) : (
                            <GroupRow
                              group={group}
                              isEditing={isEditing}
                              onStartEdit={() => handleStartEdit(String(group.id || ""))}
                              onSaveEdit={(name) => handleSaveGroupEdit(String(group.id || ""), name)}
                              onCancelEdit={handleCancelGroupEdit}
                              index={index}
                            />
                          )}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-zinc-500 dark:text-zinc-400">
                    Contacts coming soon
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteModal onClose={handleInviteModalClose} />
      )}
    </div>
  );
}

