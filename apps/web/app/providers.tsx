"use client";

import { NoteProvider } from "@/contexts/NoteContext";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import useLocalStorage from "@/hooks/use-local-storage";
import { queryClient } from "@/lib/react-query";
import { WorkspaceProvider } from "@/contexts/workspaceContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider, useTheme } from "next-themes";
import { type Dispatch, type ReactNode, type SetStateAction, createContext } from "react";
import { Toaster } from "sonner";
import { NotificationProvider } from "@/contexts/notification/notificationContext";
import { SocketProvider } from "@/contexts/socketContext";
import { NotificationSocketListener } from "@/contexts/notification/notificationSocketListner";
import { BoardProvider } from "@/contexts/boardContext";
import { CommentPanelProvider } from "@/contexts/inlineCommentContext";
import { EmbedModalProvider } from "@/contexts/embedModalContext";
import { SettingsModalProvider } from "@/contexts/settingsModalContext";
import SettingsModal from "@/components/tailwind/settings/modals/SettingsModal";
import { WorkAreaProvider } from "@/contexts/workAreaContext";
import { MarketplaceProvider } from "@/contexts/marketplaceContext";

export const AppContext = createContext<{
  font: string;
  setFont: Dispatch<SetStateAction<string>>;
}>({
  font: "Default",
  setFont: () => {},
});

function ToasterProvider() {
  const { theme } = useTheme();
  return <Toaster theme={theme as "light" | "dark"} position="bottom-right" />;
}

// This component can use useAuth because it's inside AuthProvider
function AppContent({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId =  user?.email || "guest";

  return (
    <SocketProvider userId={userId}>
      <WorkspaceProvider>
        <WorkAreaProvider>
          <NotificationProvider>
            <NoteProvider>
              <NotificationSocketListener />
              <BoardProvider>
              <EmbedModalProvider>
                <SettingsModalProvider>
                  <MarketplaceProvider>
                    <ToasterProvider />
                    <Analytics />
                    <SettingsModal />
                    <div style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"' }}>
                      {children}
                    </div>
                    <ReactQueryDevtools initialIsOpen={false} />
                  </MarketplaceProvider>
                </SettingsModalProvider>
                </EmbedModalProvider>
              </BoardProvider>
            </NoteProvider>
          </NotificationProvider>
        </WorkAreaProvider>
      </WorkspaceProvider>
    </SocketProvider>
  );
}


export default function Providers({ children }: { children: ReactNode }) {
  const [font, setFont] = useLocalStorage<string>("novel__font", "Default");

  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange defaultTheme="system">
      <AppContext.Provider
        value={{
          font,
          setFont,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent>
              {children}
            </AppContent>
          </AuthProvider>
        </QueryClientProvider>
      </AppContext.Provider>
    </ThemeProvider>
  );
}