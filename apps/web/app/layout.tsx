import "@/styles/globals.css";
import "@/styles/prosemirror.css";
import "katex/dist/katex.min.css";

import ChatWidget from "@/components/ChatWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedLayout from "@/components/auth/protected-layout";
import type { Metadata } from "next";
import type React from "react";
import Providers from "./providers";
import DynamicTitle from "./DynamicTitle";
const title = "";
const description =
  "Books by Betaque is a Notion-style WYSIWYG editor with AI-powered autocompletions. Built with Tiptap, OpenAI, and Vercel AI SDK.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
  twitter: {
    title,
    description,
    card: "summary_large_image",
    creator: "@steventey",
  },
  metadataBase: new URL("https://novel.sh"),
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <Providers>
            <ProtectedLayout>
            <DynamicTitle />
            {children}</ProtectedLayout>
            <ChatWidget />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
