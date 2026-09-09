import { io, Socket } from "socket.io-client";
import { getWebSocketUrl } from "./config";

class WebSocketService {
  public socket: Socket | null = null;
  private isConnected = false;
  private pendingUserRoom: string | null = null;

  connect() {
    if (this.socket && this.isConnected) return;
    const serverUrl = getWebSocketUrl();
    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    });
    this.socket.on("connect", () => {
      this.isConnected = true;
      // If there's a pending user room join, do it now
      if (this.pendingUserRoom) {
        this.joinUserRoom(this.pendingUserRoom);
        this.pendingUserRoom = null;
      }
    });
    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });
    this.socket.on("connect_error", (err) => {
      this.isConnected = false;
      console.error("[WebSocketService] Connect error", err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.pendingUserRoom = null;
    }
  }

  joinUserRoom(externalUserId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("join-user-room", externalUserId);
    } else {
      this.pendingUserRoom = externalUserId;
    }
  }

  onPeaksUpdated(callback: (data: any) => void) {
    this.socket?.on("peaks-updated", callback);
  }

  onScrapingCompleted(callback: (data: any) => void) {
    this.socket?.on("scraping-completed", callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners("peaks-updated");
    this.socket?.removeAllListeners("scraping-completed");
  }

  testConnection() {
    return !!(this.socket && this.isConnected);
  }
}

export const websocketService = new WebSocketService();
