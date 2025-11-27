import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_SERVER_URL } from "@/lib/config";

type SocketContextType = { socket: Socket | null };
const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;
    socket.emit("join-room", { userId });
    return () => socket.disconnect();
  }, [userId]);

  return <SocketContext.Provider value={{ socket: socketRef.current }}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  return useContext(SocketContext);
}

