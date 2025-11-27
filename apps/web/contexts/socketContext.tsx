"use client";
import { createContext, useContext, useEffect, useRef, ReactNode, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

interface SocketProviderProps {
  userId: string;
  children: ReactNode;
}

export const SocketProvider = ({ userId, children }: SocketProviderProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  useEffect(() => {
    if (!userId) return;

    // Initialize socket only once
    const socket = io(process.env.SOCKET_SERVER_URL, {
        // transports: ["websocket"],
    });

    socket.on("connect", () => console.log("Socket Connected !"));

    socketRef.current = socket;
    setSocketInstance(socket);

    // Join a room for the user
    socket.emit("join-room", { userId });

    // Example listeners (you can add more)
    // socket.on("receive-mention", (data) => console.log("🔔 Mention:", data));
    // socket.on("note-shared", (data) => console.log("📩 Note shared:", data));
    // socket.on("receive-join-request", (data) => {
    //     console.log("👥 Join request received:", data);
    // });   
    // socket.on("join-request-update", (data) => console.log("⚡ Join decision:", data));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [userId]);

  return <SocketContext.Provider value={{ socket: socketInstance }}>{children}</SocketContext.Provider>;
};

export function  useSocketContext() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("socketContext must be used within a socketProvider");
    }
    return context; 
} 
    
