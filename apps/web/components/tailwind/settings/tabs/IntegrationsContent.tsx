"use client";

import { useMemo } from "react";
import { useApiDelete, useApiGet } from "@/hooks/use-api";
import { ConnectionCard, ConnectionCardGrid } from "@/components/tailwind/ui/ConnectionCard";
import { AVAILABLE_CONNECTIONS, Connection } from "./connectionTypes";

type InstallationSummary = {
  id: number;
  accountId: number;
  accountLogin: string;
  repositorySelection: "all" | "selected";
  targetType?: string;
  suspendedAt?: string;
};

type GitHubConnectionStatus = {
  connected: boolean;
  githubLogin?: string;
  githubAvatarUrl?: string;
  installations?: InstallationSummary[];
  updatedAt?: string;
  createdAt?: string;
};

const STATUS_QUERY_KEY = ["github-connection-status"];

export default function IntegrationsContent() {
  const { data, isLoading, isFetching, isError, refetch } = useApiGet<GitHubConnectionStatus>(
    STATUS_QUERY_KEY,
    "/api/github/connection",
    undefined,
    { refetchOnWindowFocus: false },
  );

  const {
    mutate: disconnect,
    isPending: isDisconnecting,
    error: disconnectError,
  } = useApiDelete<{ success: boolean }>(
    "/api/github/connection",
    {
      onSuccess: () => {
        refetch();
      },
    },
    [STATUS_QUERY_KEY],
  );

  const connectedState = useMemo(() => {
    if (!data) return { connected: false };
    return data;
  }, [data]);

  // Get connected connections
  const connectedConnections = useMemo(() => {
    const connected: Connection[] = [];
    if (connectedState.connected) {
      // Find GitHub connection and mark it as connected
      const githubConnection = AVAILABLE_CONNECTIONS.find((c) => c.id === "github");
      if (githubConnection) {
        connected.push({
          ...githubConnection,
          isConnected: true,
          actionButtonText: "Manage",
        });
      }
    }
    return connected;
  }, [connectedState.connected]);

  // Get recommended connections (all available connections that are not connected)
  const recommendedConnections = useMemo(() => {
    const connectedIds = new Set(connectedConnections.map((c) => c.id));
    return AVAILABLE_CONNECTIONS.filter((c) => !connectedIds.has(c.id));
  }, [connectedConnections]);

  const handleConnectionAction = (connection: Connection) => {
    if (connection.id === "github") {
      if (connection.isConnected) {
        // Handle manage/reconnect for GitHub
        const redirectParam = encodeURIComponent("/settings?tab=integrations");
        window.location.href = `/api/github/connect?redirect=${redirectParam}`;
      } else {
        const redirectParam = encodeURIComponent("/settings?tab=integrations");
        window.location.href = `/api/github/connect?redirect=${redirectParam}`;
      }
    } else {
      // Handle other connections - can be extended later
      console.log("Connect to", connection.id);
    }
  };

  const renderIcon = (connection: Connection) => {
    if (typeof connection.icon === "string") {
      return (
        <img
          src={connection.icon}
          alt={connection.name}
          className="w-9 h-9 p-1 rounded-md object-contain"
          onError={(e) => {
            // Fallback to a placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
      );
    }
    return <div className="w-9 h-9 flex items-center justify-center">{connection.icon}</div>;
  };

  const hasConnections = connectedConnections.length > 0;

  return (
    <div className="flex flex-col h-full w-auto">
      <div className="flex-grow transform translate-z-0 overflow-auto">
        {/* Connected Connections Section */}
        {hasConnections && (
          <div className="mb-8">
            <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
              <div className="flex justify-between min-h-7 text-base font-medium">
                Connected
              </div>
            </div>
            <ConnectionCardGrid>
              {connectedConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  name={connection.name}
                  icon={renderIcon(connection)}
                  description={connection.description}
                  badges={connection.badges}
                  actionButtonText={connection.actionButtonText}
                  actionButtonVariant={connection.actionButtonVariant}
                  onAction={() => handleConnectionAction(connection)}
                />
              ))}
            </ConnectionCardGrid>
          </div>
        )}

        {/* Recommended Connections Section */}
        <div>
          <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
            <div className="flex justify-between min-h-7 text-base font-medium">
              {hasConnections ? "Discover new connections" : "Connections"}
            </div>
          </div>
          <ConnectionCardGrid>  
            {/* Regular Connection Cards */}
            {recommendedConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                name={connection.name}
                icon={renderIcon(connection)}
                description={connection.description}
                badges={connection.badges}
                actionButtonText={connection.actionButtonText}
                actionButtonVariant={connection.actionButtonVariant}
                onAction={() => handleConnectionAction(connection)}
              />
            ))}
          </ConnectionCardGrid>
        </div>

        {/* Error Messages */}
        {isError && (
          <div className="mt-4 text-sm text-red-500">
            Could not load connection status. Please try again.
          </div>
        )}
        {disconnectError && (
          <div className="mt-4 text-sm text-red-500">
            Unable to disconnect right now. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

