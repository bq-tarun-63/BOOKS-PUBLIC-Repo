"use client";

import React from "react";
import { ConnectionCardProps } from "@/components/tailwind/ui/ConnectionCard";

export interface Connection extends Omit<ConnectionCardProps, "icon" | "iconOverlay"> {
  id: string;
  icon: string | React.ReactNode; // Can be image URL or React component
  iconOverlay?: React.ReactNode;
  showPlusIcon?: boolean;
  isConnected?: boolean;
  connectUrl?: string;
  category?: "productivity" | "development" | "communication" | "storage" | "ai";
}

export const AVAILABLE_CONNECTIONS: Connection[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "https://www.notion.so/images/external_integrations/github-icon.png",
    description: "View the latest updates from GitHub in Notion pages and databases",
    badges: ["Link Preview", "Sync"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "development",
  },
  {
    id: "github-workspace",
    name: "GitHub (Workspace)",
    icon: "https://www.notion.so/images/external_integrations/github-icon.png",
    description: "Enable everyone in your workspace to link PRs in databases and automate workflows",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "development",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "https://www.notion.so/images/external_integrations/slack-icon.png",
    description: "Notifications, live links, and workflows between Notion and Slack",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "communication",
  },
  {
    id: "jira",
    name: "Jira",
    icon: "https://www.notion.so/images/external_integrations/jira-icon.png",
    description: "View the latest updates from Jira in Notion pages and databases",
    badges: ["Link Preview", "Sync"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "productivity",
  },
  {
    id: "jira-sync",
    name: "Jira Sync",
    icon: "https://www.notion.so/images/external_integrations/jira-icon.png",
    description: "Sync projects & issues from Jira into Notion Projects",
    badges: ["Link Preview", "Sync"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "productivity",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: "https://s3-us-west-2.amazonaws.com/public.notion-static.com/8fb58690-ee50-4584-b9fd-ca9b524f56aa/google-drive-icon-19632.png",
    description: "Add previews of files.",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "storage",
  },
  {
    id: "figma",
    name: "Figma",
    icon: "/images/external_integrations/figma-icon.png",
    description: "View Figma designs directly in Notion",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "productivity",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: "https://s3-us-west-2.amazonaws.com/public.notion-static.com/50cf5244-07dc-4b4e-a028-963a89e8e6a5/gitlab-logo-500.png",
    description: "View the latest updates from GitLab in Notion pages and databases",
    badges: ["Link Preview", "Sync"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "development",
  },
  {
    id: "trello",
    name: "Trello",
    icon: "/images/external_integrations/trello-icon.png",
    description: "Easily sync Trello cards in Notion",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "productivity",
  },
  {
    id: "asana",
    name: "Asana",
    icon: "https://s3-us-west-2.amazonaws.com/public.notion-static.com/6b63a33f-21b1-48b0-853c-f026de71513b/Asana-Logo-Vertical-Coral-Black.svg",
    description: "Bring Asana tasks into Notion to see the latest updates across teams",
    badges: ["Link Preview", "Sync"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "productivity",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: "/images/external_integrations/dropbox-icon.png",
    description: "Add and preview Dropbox files directly in Notion",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "storage",
  },
  {
    id: "zoom",
    name: "Zoom",
    icon: "/images/external_integrations/zoom-icon.png",
    description: "Easily share Zoom meeting details in Notion",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "communication",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: "/images/external_integrations/onedrive-icon.png",
    description: "See files from OneDrive and Sharepoint in Notion",
    badges: ["Link Preview"],
    actionButtonText: "Connect",
    actionButtonVariant: "connect",
    category: "storage",
  },
];
