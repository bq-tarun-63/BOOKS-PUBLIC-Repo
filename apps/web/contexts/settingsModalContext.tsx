"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { useWorkspaceContext } from "./workspaceContext";
import { deleteWithAuth, postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface WorkspaceSettings {
  name: string;
  icon: string;
  allowedEmailDomains: string[];
  analyticsEnabled: boolean;
  profilesEnabled: boolean;
  hoverCardsEnabled: boolean;
}

export interface SettingsModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Workspace settings
  workspaceSettings: WorkspaceSettings;
  updateWorkspaceName: (name: string) => Promise<void>;
  updateWorkspaceIcon: (icon: string) => Promise<void>;
  updateAllowedEmailDomains: (domains: string[]) => Promise<void>;
  toggleAnalytics: (enabled: boolean) => Promise<void>;
  toggleProfiles: (enabled: boolean) => Promise<void>;
  toggleHoverCards: (enabled: boolean) => Promise<void>;
  exportWorkspace: () => Promise<void>;
  deleteWorkspace: () => Promise<void>;
  confirmDeleteWorkspace: () => Promise<void>;
  copyWorkspaceId: () => void;
  // Delete workspace modal
  showDeleteWorkspaceModal: boolean;
  setShowDeleteWorkspaceModal: (show: boolean) => void;
  isDeletingWorkspace: boolean;
  // People settings
  inviteLinkEnabled: boolean;
  inviteLink: string;
  peopleTab: "members" | "groups" | "contacts";
  setPeopleTab: (tab: "members" | "groups" | "contacts") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  copyInviteLink: () => void;
  generateNewInviteLink: () => Promise<void>;
  toggleInviteLink: (enabled: boolean) => Promise<void>;
  // Teamspace settings
  defaultTeamspaces: string[];
  setDefaultTeamspaces: (teamspaces: string[]) => void;
  updateDefaultTeamspaces: () => Promise<void>;
  limitCreationToOwners: boolean;
  toggleLimitCreationToOwners: (enabled: boolean) => Promise<void>;
  teamspaceSearchQuery: string;
  setTeamspaceSearchQuery: (query: string) => void;
  teamspaceFilters: {
    owner: boolean;
    access?: string;
  };
  setTeamspaceFilters: (filters: {
    owner: boolean;
    access?: string;
  }) => void;
  createTeamspace: () => Promise<void>;
}

const SettingsModalContext = createContext<SettingsModalContextType | undefined>(undefined);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("user_settings");
  const { currentWorkspace, setCurrentWorkspace ,fetchAllWorkspace } = useWorkspaceContext();
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>({
    name: currentWorkspace?.name || "",
    icon: (currentWorkspace as any)?.icon || "",
    allowedEmailDomains: [],
    analyticsEnabled: false,
    profilesEnabled: false,
    hoverCardsEnabled: false,
  });

  // Update settings when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceSettings({
        name: currentWorkspace.name || "",
        icon: (currentWorkspace as any)?.icon || "",
        allowedEmailDomains: [],
        analyticsEnabled: false,
        profilesEnabled: false,
        hoverCardsEnabled: false,
      });
    }
  }, [currentWorkspace]);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const updateWorkspaceName = async (name: string) => {
    if (!currentWorkspace?._id) return;
    
    // Store previous state for rollback
    const previousName = workspaceSettings.name;
    const previousWorkspaceName = currentWorkspace.name;
    
    // Optimistic update for immediate UI feedback
    setWorkspaceSettings((prev) => ({ ...prev, name }));
    setCurrentWorkspace({ ...currentWorkspace, name });
    
    try {
      const response = await postWithAuth("/api/workSpace/settings/general/updateWorkspace", {
        workspaceId: currentWorkspace._id,
        name,
        icon: workspaceSettings.icon ? workspaceSettings.icon : "",
        allowedDomains: workspaceSettings.allowedEmailDomains,
        diplayAnalytics: workspaceSettings.analyticsEnabled,
        Profiles: workspaceSettings.profilesEnabled,
        HoverCards: workspaceSettings.hoverCardsEnabled,
      });
      
      // Check if response is an error
      if ("isError" in response && response.isError) {
        const errorResponse = response as { message: string; isError: true };
        // Rollback optimistic update
        setWorkspaceSettings((prev) => ({ ...prev, name: previousName }));
        setCurrentWorkspace({ ...currentWorkspace, name: previousWorkspaceName });
        toast.error(errorResponse.message || "Failed to update workspace name");
        console.error("Error updating workspace name:", errorResponse.message);
        return;
      }
      
      toast.success("Workspace name updated");
    } catch (error) {
      // Rollback optimistic update on network/parsing error
      setWorkspaceSettings((prev) => ({ ...prev, name: previousName }));
      setCurrentWorkspace({ ...currentWorkspace, name: previousWorkspaceName });
      toast.error("Failed to update workspace name");
      console.error(error);
    }
  };

  const updateWorkspaceIcon = async (icon: string) => {
    if (!currentWorkspace?._id) return;
    // Optimistic update for immediate UI feedback
    const prevIcon = workspaceSettings.icon;
    setWorkspaceSettings((prev) => ({ ...prev, icon }));
    setCurrentWorkspace({ ...currentWorkspace, icon } as any);
    try {
      await postWithAuth("/api/workSpace/settings/general/updateWorkspace", {
        workspaceId: currentWorkspace._id,
        name: workspaceSettings.name,
        icon,
        allowedDomains: workspaceSettings.allowedEmailDomains,
        diplayAnalytics: workspaceSettings.analyticsEnabled,
        Profiles: workspaceSettings.profilesEnabled,
        HoverCards: workspaceSettings.hoverCardsEnabled,
      });
      toast.success(icon ? "Workspace icon updated" : "Workspace icon removed");
    } catch (error) {
      // Revert on failure
      setWorkspaceSettings((prev) => ({ ...prev, icon: prevIcon }));
      setCurrentWorkspace({ ...currentWorkspace, icon: prevIcon } as any);
      toast.error("Failed to update workspace icon");
      console.error(error);
    }
  };

  const updateAllowedEmailDomains = async (domains: string[]) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        allowedEmailDomains: domains,
      });
      setWorkspaceSettings((prev) => ({ ...prev, allowedEmailDomains: domains }));
      toast.success("Email domains updated");
    } catch (error) {
      toast.error("Failed to update email domains");
      console.error(error);
    }
  };

  const toggleAnalytics =  async (enabled: boolean) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        analyticsEnabled: enabled,
      });
      setWorkspaceSettings((prev) => ({ ...prev, analyticsEnabled: enabled }));
      toast.success(`Analytics ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update analytics setting");
      console.error(error);
    }
  };

  const toggleProfiles = async (enabled: boolean) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        profilesEnabled: enabled,
      });
      setWorkspaceSettings((prev) => ({ ...prev, profilesEnabled: enabled }));
      toast.success(`Profiles ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update profiles setting");
      console.error(error);
    }
  };

  const toggleHoverCards =  async (enabled: boolean) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        hoverCardsEnabled: enabled,
      });
      setWorkspaceSettings((prev) => ({ ...prev, hoverCardsEnabled: enabled }));
      toast.success(`Hover cards ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update hover cards setting");
      console.error(error);
    }
  };

  const exportWorkspace = async () => {
    if (!currentWorkspace?._id) return;
    try {
      const response = await postWithAuth("/api/workSpace/export", {
        workspaceId: currentWorkspace._id,
      });
      toast.success("Export started");
      // Handle download if response contains file
      if (response.downloadUrl) {
        window.open(response.downloadUrl, "_blank");
      }
    } catch (error) {
      toast.error("Failed to export workspace");
      console.error(error);
    }
  };

  // Delete workspace modal state
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const deleteWorkspace = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setShowDeleteWorkspaceModal(true);
  }, [currentWorkspace?._id]);

  const confirmDeleteWorkspace = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setIsDeletingWorkspace(true);
    try {
      await deleteWithAuth("/api/workSpace/delete", {
        body: JSON.stringify({
            workspaceId: currentWorkspace._id,
        }),
      });
      toast.success("Workspace deleted");
      closeModal();
      setShowDeleteWorkspaceModal(false);
      setCurrentWorkspace(null);
      router.push("/organization/workspace");
    } catch (error) {
      toast.error("Failed to delete workspace");
      console.error(error);
    } finally {
      setIsDeletingWorkspace(false);
    }
  }, [currentWorkspace?._id]);

  const copyWorkspaceId = useCallback(() => {
    if (currentWorkspace?._id) {
      navigator.clipboard.writeText(currentWorkspace._id);
      toast.success("Workspace ID copied to clipboard");
    }
  }, [currentWorkspace?._id]);

  // People settings state
  const [inviteLinkEnabled, setInviteLinkEnabled] = useState(true);
  const [inviteLink, setInviteLink] = useState("");
  const [peopleTab, setPeopleTab] = useState<"members" | "groups" | "contacts">("members");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize invite link
  useEffect(() => {
    if (currentWorkspace?._id) {
      const link = `${window.location.origin}/join/${currentWorkspace._id}`;
      setInviteLink(link);
    }
  }, [currentWorkspace?._id]);

  const copyInviteLink = useCallback(() => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
    }
  }, [inviteLink]);

  const generateNewInviteLink = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      // TODO: Call API to generate new invite link token
      const newLink = `${window.location.origin}/join/${currentWorkspace._id}?token=${Date.now()}`;
      setInviteLink(newLink);
      toast.success("New invite link generated");
    } catch (error) {
      toast.error("Failed to generate new link");
      console.error(error);
    }
  }, [currentWorkspace?._id]);

  const toggleInviteLink = useCallback(async (enabled: boolean) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        inviteLinkEnabled: enabled,
      });
      setInviteLinkEnabled(enabled);
      toast.success(`Invite link ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update invite link setting");
      console.error(error);
    }
  }, [currentWorkspace?._id]);

  // Teamspace settings state
  const [defaultTeamspaces, setDefaultTeamspaces] = useState<string[]>([]);
  const [limitCreationToOwners, setLimitCreationToOwners] = useState(false);
  const [teamspaceSearchQuery, setTeamspaceSearchQuery] = useState("");
  const [teamspaceFilters, setTeamspaceFilters] = useState<{
    owner: boolean;
    access?: string;
  }>({
    owner: false,
  });

  // Initialize default teamspaces from current workspace
  useEffect(() => {
    if (currentWorkspace?._id && defaultTeamspaces.length === 0) {
      // Set current workspace as default if it exists
      setDefaultTeamspaces([currentWorkspace._id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?._id]);

  const updateDefaultTeamspaces = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        defaultTeamspaces,
      });
      toast.success("Default teamspaces updated");
    } catch (error) {
      toast.error("Failed to update default teamspaces");
      console.error(error);
    }
  }, [currentWorkspace?._id, defaultTeamspaces]);

  const toggleLimitCreationToOwners = useCallback(async (enabled: boolean) => {
    if (!currentWorkspace?._id) return;
    try {
      await postWithAuth("/api/workSpace/update", {
        workspaceId: currentWorkspace._id,
        limitTeamspaceCreationToOwners: enabled,
      });
      setLimitCreationToOwners(enabled);
      toast.success(`Teamspace creation ${enabled ? "limited to owners" : "opened to all"}`);
    } catch (error) {
      toast.error("Failed to update teamspace creation setting");
      console.error(error);
    }
  }, [currentWorkspace?._id]);

  const createTeamspace = useCallback(async () => {
    // TODO: Open create teamspace modal or navigate to creation page
    toast.info("Create teamspace functionality coming soon");
  }, []);

  return (
    <SettingsModalContext.Provider
      value={{
        isOpen,
        openModal,
        closeModal,
        activeTab,
        setActiveTab,
        workspaceSettings,
        updateWorkspaceName,
        updateWorkspaceIcon,
        updateAllowedEmailDomains,
        toggleAnalytics,
        toggleProfiles,
        toggleHoverCards,
        exportWorkspace,
        deleteWorkspace,
        copyWorkspaceId,
        showDeleteWorkspaceModal,
        setShowDeleteWorkspaceModal,
        isDeletingWorkspace,
        confirmDeleteWorkspace,
        inviteLinkEnabled,
        inviteLink,
        peopleTab,
        setPeopleTab,
        searchQuery,
        setSearchQuery,
        copyInviteLink,
        generateNewInviteLink,
        toggleInviteLink,
        defaultTeamspaces,
        setDefaultTeamspaces,
        updateDefaultTeamspaces,
        limitCreationToOwners,
        toggleLimitCreationToOwners,
        teamspaceSearchQuery,
        setTeamspaceSearchQuery,
        teamspaceFilters,
        setTeamspaceFilters,
        createTeamspace,
      }}
    >
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (context === undefined) {
    throw new Error("useSettingsModal must be used within a SettingsModalProvider");
  }
  return context;
}

