"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getWithAuth } from "@/lib/api-helpers";
import type { User } from "@/types/user";
import type { ApiErrorResponse } from "@/lib/api-helpers";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await getWithAuth<User | ApiErrorResponse>("/api/user");

        if ("error" in response || "message" in response) {
          return null;
        }
        const user: User = response;

        localStorage.setItem("user", JSON.stringify(user));
        
        if (!user?.organizationId) {
          console.log("User does not have organization, redirecting to signup");
          router.push("/signup/organization");
        } else {
          console.log("User has organization, redirecting to workspace");
          router.push(`/organization/workspace`);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
      }
    };
    checkUser();
  }, [router]);
  
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Redirecting...</span>
      </div>
    </div>
  );
}
