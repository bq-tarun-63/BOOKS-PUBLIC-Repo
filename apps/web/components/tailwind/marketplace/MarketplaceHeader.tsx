"use client";

import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import Link from "next/link";

export function MarketplaceHeader() {
  const { user } = useAuth();

  return (
    <div className="px-12 h-[60px] mx-auto mb-3.5 flex items-center pt-[13px] pb-2.5 justify-between sticky -top-px z-[2] bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      {/* Logo */}
      <div className="flex flex-row items-center justify-start">
        <Link
          href="/"
          className="block text-inherit no-underline select-none cursor-pointer"
        >
          <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            books.
          </span>
        </Link>
      </div>

      {/* Profile Menu */}
      <div className="flex items-center">
        <div data-popup-origin="true" className="contents">
          <div className="ms-[18px]">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={false}
              aria-haspopup="dialog"
              className="select-none transition-[background] duration-20 ease-in cursor-pointer rounded-full"
            >
              <div>
                <div className="rounded-full w-8 h-8 flex items-center justify-center select-none opacity-100">
                  <div className="w-full h-full">
                    {user?.image ? (
                      <Image
                        alt={user.name || "User"}
                        src={user.image}
                        width={32}
                        height={32}
                        referrerPolicy="same-origin"
                        className="block object-cover rounded-full w-full h-full shadow-none outline outline-1 outline-offset-[-1px]"
                        style={{
                          background: "var(--c-bacPri)",
                          outlineColor: "var(--ca-borSecTra)",
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center text-sm font-medium"
                        style={{
                          background: "var(--c-bacPri)",
                          color: "var(--c-texPri)",
                        }}
                      >
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

