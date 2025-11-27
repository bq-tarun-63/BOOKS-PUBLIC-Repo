import ChatInterface from "@/components/ui/chat-interface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat with your Notes | BetaQue Notes",
  description: "Chat with your notes using AI assistant",
};

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat with your Notes</h1>
      <div className="h-[600px]">
        <ChatInterface />
      </div>
    </div>
  );
}
