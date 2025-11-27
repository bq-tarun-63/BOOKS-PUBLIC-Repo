"use client";
import { Check, Monitor, Moon, SunDim, ChevronDown, LogOut } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";
import NotificationModal from "@/components/tailwind/ui/modals/notificationModal"

import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

const appearances = [
  {
    theme: "System",
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    theme: "Light",
    icon: <SunDim className="h-4 w-4" />,
  },
  {
    theme: "Dark",
    icon: <Moon className="h-4 w-4" />,
  },
];

export default function Menu() {
  const { theme: currentTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
<div className="flex items-center gap-4">
       {/* 🔔 Notification Modal */}
      <div className="relative">
        <NotificationModal/>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition group">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-transparent group-hover:border-gray-300 dark:group-hover:border-[rgb(42,42,42)] transition-colors">
              {user.image && (
                <Image
                src={user.image}
                alt="Profile"
                fill
                className="object-cover"
                />
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-2 rounded-xl shadow-lg border border-gray-200 dark:border-[rgb(42,42,42)] bg-[#f8f8f7] dark:bg-[hsl(0deg_0%_12.55%)]"
          align="end"
          sideOffset={8}
          >
          {/* User Profile Section */}
          <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-[rgb(42,42,42)]">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              {user.image && (
                <Image
                src={user.image}
                alt="Profile"
                fill
                className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              APPEARANCE
            </p>
            <div className="space-y-1">
              {appearances.map(({ theme, icon }) => (
                <button
                key={theme}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${currentTheme === theme.toLowerCase()
                  ? "bg-gray-100 dark:bg-[rgb(42,42,42)] text-gray-900 dark:text-gray-100"
                  : "hover:bg-gray-50 dark:hover:bg-[rgb(42,42,42)] text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => setTheme(theme.toLowerCase())}
                  >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-500 dark:text-gray-400">
                      {icon}
                    </div>
                    <span>{theme}</span>
                  </div>
                  {currentTheme === theme.toLowerCase() && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="p-2 pt-1 border-t border-gray-100 dark:border-[rgb(42,42,42)]">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[rgba(42,42,42,0.5)] transition-colors"
              >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>

  );
}