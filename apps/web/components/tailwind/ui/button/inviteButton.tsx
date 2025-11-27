"use client";

import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import InviteModal from "../modals/inviteMemberModal";

export default function InviteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Invite Members Small Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
      >
        <UserPlus className="w-3.5 h-3.5 fill-current" />
        Invite members
      </div>

      {/* Invite Modal */}
      {open && <InviteModal onClose={() => setOpen(false)} />}
    </>
  );
}
