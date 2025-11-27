import { LogOut, MessageSquare } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function NavigationBar() {
  return (
    <nav className="flex items-center justify-end px-4 py-2 border-b border-gray-200 dark:border-gray-800">
      <div className="flex gap-2">
        <Link
          href="/chat"
          className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm"
          title="Chat with your notes"
        >
          <MessageSquare className="w-5 h-5 mr-1" />
          <span className="hidden sm:inline">Chat</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm"
          title="Sign out"
        >
          <LogOut className="w-5 h-5 mr-1" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
