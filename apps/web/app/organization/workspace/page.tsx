"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import CryptoJS from "crypto-js";
import { ArrowRight, Loader2, Lock, Plus, Sparkles, Unlock, Users, Zap } from "lucide-react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { postWithAuth } from "@/lib/api-helpers";
import type { Members, Workspace } from "@/types/workspace";
import { isWorkspaceMember } from "@/services-frontend/user/userServices";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { toast } from "sonner";
import { OverlappingAvatars } from "@/components/tailwind/ui/avatar";
import { useNotifications } from "@/hooks/use-notifications";


// ---------- LOCAL COMPONENTS ----------

const SECRET_KEY = process.env.NEXT_PUBLIC_CJS_TOKEN;
// Button
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-102 active:scale-98",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white shadow-sm hover:shadow-md hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100",
        destructive: "bg-red-600 text-white shadow-sm hover:shadow-md hover:bg-red-700",
        outline:
          "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:hover:border-gray-500",
        ghost:
          "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 dark:hover:text-white",
        join: "bg-gray-900 text-white shadow-sm hover:shadow-md hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 py-1.5 text-xs",
        lg: "h-10 rounded-lg px-5 py-2.5 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  },
);
Button.displayName = "Button";

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-500 dark:focus-visible:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

// Subtle Background Elements
const BackgroundElement = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <div className={`absolute opacity-5 ${className}`} style={{ animationDelay: `${delay}s` }} />
);


function renderWorkspaceCard({
  ws,
  user,
  member,
  isRequested,
  joining,
  joinWorkspace,
  requestedWorkspaces,
  handleSelectedWorkspace,
  router,
}: {
  ws: Workspace;
  user: any;
  member: boolean;
  isRequested: boolean;
  joining: string | null;
  joinWorkspace: (workspaceId: string, userEmail: string, members: Members[]) => void;
  requestedWorkspaces: string[];
  handleSelectedWorkspace: (workspace: Workspace) => void;
  router: any;
}) {
  const members = ws.members || [];

  const enterWorkspace = () => {
    localStorage.setItem("selectedWorkspaceName", ws.name);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify({ workspaceId: ws._id }), SECRET_KEY).toString();
    document.cookie = `workspace=${encodeURIComponent(encrypted)}; path=/; max-age=${60 * 60 * 24}; samesite=strict`;
    handleSelectedWorkspace(ws);
    router.push("/notes");
  };

  return (
    <div
      key={ws._id}
      className={`group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
        member
          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
          : isRequested
            ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      onClick={() => {
        if (member) {
          enterWorkspace();
        }
      }}
      onKeyPress={(e) => {
        if (e.key === "Enter" && member) {
            enterWorkspace();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Mobile Layout */}
      <div className="flex flex-col sm:hidden space-y-3">
        {/* Top Row - Icon, Title, Status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              member
                ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                : isRequested
                  ? "bg-gray-600 text-white"
                  : "bg-gray-400 text-white"
            }`}
          >
            {member ? (
              <Unlock className="w-5 h-5" />
            ) : isRequested ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{ws.name}</h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                member
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : isRequested
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {member ? "Member" : isRequested ? "Pending" : "Private"}
            </span>
          </div>
        </div>

        {/* Bottom Row - Date, Members, Action */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Created{" "}
            {new Date(ws.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="flex items-center gap-3">
            {members.length > 0 && <OverlappingAvatars members={members} maxVisible={2} />}
            {/* Action Button */}
            {member ? (
              <Button
                variant="outline"
                size="sm"
                className="group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 dark:group-hover:bg-white dark:group-hover:text-black dark:group-hover:border-white transition-all duration-200"
              >
                <ArrowRight className="w-4 h-4 mr-1" />
                Enter
              </Button>
            ) : (
              <div>
                {ws.requests?.some((n) => n.userEmail === user?.email) || 
                  requestedWorkspaces.includes(ws._id)
                  ? (
                  <Button size="sm" disabled className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                    Requested
                  </Button>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(user) joinWorkspace(ws._id, user.email, ws.members);
                    }}
                    variant="join"
                    size="sm"
                    disabled={joining === ws._id}
                    className="text-xs"
                  >
                    {joining === ws._id ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Joining
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Join
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Left Section - Workspace Info */}
        <div className="flex items-center gap-4 flex-1">
          {/* Status Icon */}
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              member
                ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                : isRequested
                  ? "bg-gray-600 text-white"
                  : "bg-gray-400 text-white"
            }`}
          >
            {member ? (
              <Unlock className="w-5 h-5" />
            ) : isRequested ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>

          {/* Workspace Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate sm:max-w-[160px] md:max-w-[250px] lg:max-w-[300px]">{ws.name}</h3>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  member
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : isRequested
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {member ? "Member" : isRequested ? "Pending" : "Private"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created{" "}
              {new Date(ws.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Right Section - Members & Actions */}
        <div className="flex items-center gap-10">
          {/* Member Count */}
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              {members.length > 0 ? <OverlappingAvatars members={members} maxVisible={3} /> : null}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            {member ? (
              <Button
                variant="outline"
                size="sm"
                className="group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 dark:group-hover:bg-white dark:group-hover:text-black dark:group-hover:border-white transition-all duration-200"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Enter
              </Button>
            ) : (
              <div>
                {ws.requests?.some((n) => n.userEmail === user?.email) || 
                  requestedWorkspaces.includes(ws._id)
                  ? (
                  <Button size="sm" disabled className="w-full bg-gray-600 text-gray-600 border-gray-200">
                    Requested
                  </Button>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(user) joinWorkspace(ws._id, user.email, ws.members);
                    }}
                    variant="join"
                    size="sm"
                    disabled={joining === ws._id}
                    className="w-full"
                  >
                    {joining === ws._id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- WORKSPACE PAGE ----------

export default function OrganizationWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  const [loading, setLoading] = useState(true);
      // const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const {user} = useAuth();
  const [requestedWorkspaces, setRequestedWorkspaces] = useState<string[]>([]);
  const { workspaces, fetchAllWorkspace, setCurrentWorkspace , handleSelectedWorkspace } = useWorkspaceContext();
  const [joining, setJoining] = useState<string | null>(null);
  const { mentionUser, shareNote, sendJoinRequest, decideJoinRequest } = useNotifications();
  const [workspaceType, setWorkspaceType] = useState<'public' | 'private'>('public');



  const { logout } = useAuth();

  if (!user) return null;

  // Load requests from localStorage when page loads
  useEffect(() => {
    const savedRequests = localStorage.getItem("requestedWorkspaces");
    if (savedRequests) {
      setRequestedWorkspaces(JSON.parse(savedRequests));
    }
  }, []);

  // Save requests whenever updated
  useEffect(() => {
    localStorage.setItem("requestedWorkspaces", JSON.stringify(requestedWorkspaces));
  }, [requestedWorkspaces]);


  // Fetch all workspaces for the org
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await fetchAllWorkspace();
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create new workspace
  const createWorkspace = async () => {
    if (!workspaceName.trim()) return;
    try {
      setShowCreateModal(false);
      const newWs = await postWithAuth("/api/workSpace/create", {
        name: workspaceName,
        type: workspaceType,
      });
      localStorage.setItem("selectedWorkspaceName", workspaceName);

      // Encrypt workspaceId
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify({ workspaceId: newWs._id }),
        SECRET_KEY,
      ).toString();

      // Store encrypted token in cookie
      document.cookie = `workspace=${encodeURIComponent(
        encrypted,
      )}; path=/; max-age=${60 * 60 * 24}; samesite=strict`;
      handleSelectedWorkspace(newWs)
      router.push(`/notes`); // redirect to workspace page if needed
    } catch (err) {
      console.error("Error creating workspace:", err);
    }
  };

  // Join a workspace
  const joinWorkspace = async (workspaceId: string, userEmail: string, workspaceMebers: Members[]) => {
    const type = 'JOIN'
    setJoining(workspaceId);
    try {
      const response = await postWithAuth('/api/notification/add', {
        userEmail, 
        message: "Request to join the Workspace", 
        type,
        workspaceId 
      })
      
      if ("error" in response || "message" in response) {
        return null;
      }
      // 2️⃣ Send real-time socket notification
      sendJoinRequest(response.notification, workspaceMebers);
      
      // ✅ Add workspace to requested list
      setRequestedWorkspaces((prev) => [...prev, workspaceId]);
      toast.success("Request to join workspace send successfully");

    } catch (err) {
      console.error("Error joining workspace:", err);
      toast.error(err);
    }
    finally{
      setJoining(null);
    }
  };

  const visibleWorkspaces = workspaces.filter(ws => {
    if (ws.type === 'public') return true; // everyone can see public
    if (ws.type === 'private') return ws.ownerId === user.email || isWorkspaceMember(ws, user.email);
    return false;
  });


  const sortedWorkspaces = React.useMemo(() => {
    if (!user) return workspaces;

      // Private workspaces where the user is a member or invited
      const privateMembers = visibleWorkspaces.filter(
        ws => ws.type === 'private' && (isWorkspaceMember(ws, user.email))
      );

      // Public workspaces where the user is a member
      const publicMembers = visibleWorkspaces.filter(
        ws => ws.type === 'public' && isWorkspaceMember(ws, user.email)
      );

      // Public workspaces where the user has requested
      const requested = visibleWorkspaces.filter(
        ws =>
          ws.type === 'public' &&
          !isWorkspaceMember(ws, user.email) &&
          (ws.requests?.some(n => n.userEmail === user?.email) || requestedWorkspaces.includes(ws._id))
      );

      // Other public workspaces
      const others = visibleWorkspaces.filter(
        ws =>
          ws.type === 'public' &&
          !isWorkspaceMember(ws, user.email) &&
          !(ws.requests?.some(n => n.userEmail === user?.email) || requestedWorkspaces.includes(ws._id))
      );

    return [...privateMembers, ...publicMembers ,...requested, ...others];
  }, [visibleWorkspaces, user, requestedWorkspaces]);

  const privateWorkspaces = sortedWorkspaces.filter(
    (ws) => ws.type === "private" && (isWorkspaceMember(ws, user.email) || ws.ownerId === user.email)
  );
  
  const publicWorkspaces = sortedWorkspaces.filter(
    (ws) => ws.type === "public"
  );

  useEffect(() => {
  },[sortedWorkspaces, workspaces])

  useEffect(() => {
    fetchWorkspaces();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="relative">
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-full blur-xl opacity-20 animate-pulse" />
          <Loader2 className="relative animate-spin w-12 h-12 text-gray-900 dark:text-white" />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-white dark:bg-black">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <BackgroundElement
          className="w-96 h-96 border border-gray-300 dark:border-gray-700 -top-48 -right-48 rotate-45"
          delay={0}
        />
        <BackgroundElement
          className="w-80 h-80 border border-gray-200 dark:border-gray-800 -bottom-40 -left-40 rounded-full"
          delay={2}
        />
        <BackgroundElement
          className="w-64 h-64 bg-gray-100 dark:bg-gray-900 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-12"
          delay={4}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23999%22%20fill-opacity%3D%220.02%22%3E%3Crect%20x%3D%2230%22%20y%3D%2230%22%20width%3D%222%22%20height%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      </div>

      <div className="relative z-10 px-8 py-6">
        {/* Header with User Menu */}
        <div className="w-full flex justify-end mb-8">
          <Popover>
            <PopoverTrigger asChild>
              <button className="group relative flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 hover:shadow-sm transition-all duration-200">
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-transparent group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors">
                  {user.image ? (
                    <Image src={user.image} alt="Profile" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-semibold text-sm">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm"
              align="end"
              sideOffset={8}
            >
              {/* User Profile Section */}
              <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="relative h-10 w-10 overflow-hidden rounded-full ring ring-gray-100 dark:ring-gray-800">
                  {user.image ? (
                    <Image src={user.image} alt="Profile" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-semibold">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="p-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 dark:bg-white shadow-sm">
                  <Users className="w-6 h-6 text-white dark:text-black" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Workspaces</h1>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="icon"
                variant="outline"
                className="h-16 w-16 rounded-2xl"
              >
                <Plus className="w-7 h-7" />
              </Button>
            </div>
            <p className="text-gray-500 dark:text-gray-300 ml-0 sm:ml-16">
              Create collaborative spaces where your team can organize, innovate, and share ideas together
            </p>
          </div>

          {/* Workspace List */}
          <div className="space-y-6">
            {/* Private Workspaces */}
            {privateWorkspaces.length > 0 && (
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm mb-2">Private Workspaces</h2>
                <div className="space-y-3">
                  {privateWorkspaces.map((ws) => {
                    const member = isWorkspaceMember(ws, user.email);
                    const isRequested =
                      ws.requests?.some((n) => n.userEmail === user?.email) ||
                      requestedWorkspaces.includes(ws._id);

                    return renderWorkspaceCard({
                      ws,
                      user,
                      member,
                      isRequested,
                      joining,
                      joinWorkspace,
                      requestedWorkspaces,
                      handleSelectedWorkspace,
                      router,
                    });
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            {privateWorkspaces.length > 0 && publicWorkspaces.length > 0 && (
              <div className="border-t border-gray-300 dark:border-gray-700 my-6" />
            )}

            {/* Public Workspaces */}
            {publicWorkspaces.length > 0 && (
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm mb-2">Team Workspaces</h2>
                <div className="space-y-3">
                  {publicWorkspaces.map((ws) => {
                    const member = isWorkspaceMember(ws, user.email);
                    const isRequested =
                      ws.requests?.some((n) => n.userEmail === user?.email) ||
                      requestedWorkspaces.includes(ws._id);

                    return renderWorkspaceCard({
                      ws,
                      user,
                      member,
                      isRequested,
                      joining,
                      joinWorkspace,
                      requestedWorkspaces,
                      handleSelectedWorkspace,
                      router,
                    });
                  })}
                </div>
              </div>
            )}

            {/* No workspaces fallback */}
            {privateWorkspaces.length === 0 && publicWorkspaces.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-1">No workspaces yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Create your first workspace to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-gray-900 shadow-2xl rounded-2xl p-8 w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-700">
            {/* Modal Background Pattern */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close modal"
              title="Close modal"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative z-10">
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 shadow-lg mb-6">
                  <svg
                    className="w-10 h-10 text-white dark:text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Create Workspace</h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
                  Start building something amazing with your team. Give your workspace a meaningful name that reflects
                  its purpose.
                </p>
              </div>

              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="workspace-name"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Workspace Name
                  </label>
                  <Input
                    id="workspace-name"
                    placeholder="e.g., Product Development, Marketing Team, Research Lab..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="text-base h-12 border-2 focus:border-gray-900 dark:focus:border-white transition-colors"
                    onKeyPress={(e) => e.key === "Enter" && createWorkspace()}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This name will be visible to all workspace members
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Workspace Visibility
                  </label>
                  <div className="flex gap-4">
                    {/* Public Option */}
                    <label
                      className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                        ${workspaceType === "public"
                          ? "bg-gray-100 dark:bg-gray-800 border-gray-900 dark:border-white shadow-sm"
                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                    >
                      <input
                        type="radio"
                        name="workspaceType"
                        value="public"
                        checked={workspaceType === "public"}
                        onChange={() => setWorkspaceType("public")}
                        className="hidden"
                      />
                      <span
                        className={`w-3 h-3 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200
                          ${workspaceType === "public"
                            ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white"
                            : "border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900"
                          }`}
                      >
                        {workspaceType === "public" && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Public (Visible to all org members)
                      </span>
                    </label>

                    {/* Private Option */}
                    <label
                      className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                        ${workspaceType === "private"
                          ? "bg-gray-100 dark:bg-gray-800 border-gray-900 dark:border-white shadow-sm"
                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                    >
                      <input
                        type="radio"
                        name="workspaceType"
                        value="private"
                        checked={workspaceType === "private"}
                        onChange={() => setWorkspaceType("private")}
                        className="hidden"
                      />
                      <span
                        className={`w-3 h-3 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200
                          ${workspaceType === "private"
                            ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white"
                            : "border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900"
                          }`}
                      >
                        {workspaceType === "private" && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Private (Visible only to invited members)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Features Preview */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    What you'll get:
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>Team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>Shared notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>File sharing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>Real-time updates</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createWorkspace}
                    size="lg"
                    className="flex-1 h-12 text-base font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Create Workspace
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}