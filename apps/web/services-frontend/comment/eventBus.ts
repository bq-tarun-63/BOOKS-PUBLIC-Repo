// lib/eventBus.ts
type Callback = (data: any) => void;

class EventBus {
  private listeners: Record<string, Callback[]> = {};

  on(event: string, callback: Callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Callback) {
    this.listeners[event] = (this.listeners[event] || []).filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

export const eventBus = new EventBus();
