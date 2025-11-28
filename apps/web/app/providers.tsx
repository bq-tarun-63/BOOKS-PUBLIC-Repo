"use client";

import type { ReactNode } from "react";

/**
 * Public server does not need any of the original providers or contexts.
 * This lightweight wrapper simply renders children.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}