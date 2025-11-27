"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import type { MarketplaceContextType, MarketplaceCreator } from "@/types/marketplace";
import { useAuth } from "@/hooks/use-auth";
import { getWithAuth, postWithAuth, putWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";

type ApiResponse<T> = T | { isError: true; message?: string };
const isApiError = (response: unknown): response is { isError: true; message?: string } =>
  typeof response === "object" && response !== null && "isError" in response;

const ADMIN_EMAIL_SET = new Set(
  (process.env.MARKETPLACE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MarketplaceCreator | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const isMarketplaceAdmin = Boolean(user?.email && ADMIN_EMAIL_SET.has(user.email.toLowerCase()));

  const fetchProfile = useCallback(async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const response = (await getWithAuth("/api/marketPlace/profile")) as ApiResponse<{ profile?: MarketplaceCreator | null }>;
      
      if (isApiError(response)) {
        setProfile(null);
        return;
      }
      
      const fetchedProfile = response.profile || null;
      setProfile(fetchedProfile);
    } catch (error) {
      console.error("Error fetching marketplace profile:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  const createProfile = useCallback(
    async (profileData: Partial<Omit<MarketplaceCreator, "_id" | "userId" | "userEmail" | "createdAt" | "updatedAt">>) => {
    if (!user?.email) {
      toast.error("You must be logged in to create a profile");
      return;
    }
    
    setIsCreating(true);
    try {
      const response = (await postWithAuth("/api/marketPlace/profile/create", {
        displayName: profileData.displayName,
        handle: profileData.handle,
        bio: profileData.bio,
        profilePicture: profileData.profilePicture,
        coverPhoto: profileData.coverPhoto,
        allowEmailContact: profileData.allowEmailContact,
        emailToContact: profileData.emailToContact,
        socialLinks: profileData.socialLinks,
      })) as ApiResponse<{ creator: MarketplaceCreator }>;
      
      if (isApiError(response)) {
        const errorResponse = response as { message: string; isError: true };
        toast.error(errorResponse.message || "Failed to create profile");
        return;
      }
      
      const { creator } = response as { creator: MarketplaceCreator };
      setProfile(creator);
      toast.success("Profile created successfully");
    } catch (error) {
      toast.error("Failed to create profile");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
    },
    [user?.email],
  );

  const updateProfile = useCallback(
    async (profileData: Partial<MarketplaceCreator>) => {
      if (!user?.email || !profile) {
        toast.error("Profile not found");
        return;
      }
      
      setIsUpdating(true);
      try {
        const response = (await putWithAuth(`/api/marketPlace/profile/update`, {
          displayName: profileData.displayName,
          handle: profileData.handle,
          bio: profileData.bio,
          profilePicture: profileData.profilePicture,
          coverPhoto: profileData.coverPhoto,
          allowEmailContact: profileData.allowEmailContact,
          emailToContact: profileData.emailToContact,
          socialLinks: profileData.socialLinks,
        })) as ApiResponse<{ creator: MarketplaceCreator }>;
        
        if (isApiError(response)) {
          const errorResponse = response as { message: string; isError: true };
          toast.error(errorResponse.message || "Failed to update profile");
          return;
        }
        
        const { creator } = response as { creator: MarketplaceCreator };
        setProfile(creator);
        toast.success("Profile updated successfully");
      } catch (error) {
        toast.error("Failed to update profile");
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    },
    [user?.email, profile],
  );

  // Fetch profile on mount
  useEffect(() => {
    if (user?.email) {
      fetchProfile();
    }
  }, [user?.email, fetchProfile]);

  return (
    <MarketplaceContext.Provider
      value={{
        profile,
        isLoading,
        isCreating,
        isUpdating,
        isMarketplaceAdmin,
        fetchProfile,
        createProfile,
        updateProfile,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return context;
}

