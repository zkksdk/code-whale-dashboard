import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AppState {
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  wsClientCount: number;
  setWsClientCount: (count: number) => void;

  // System status
  systemStatus: {
    configValid: boolean;
    processRunning: boolean;
    provider: string;
    uptime: number;
  };
  setSystemStatus: (status: Partial<AppState['systemStatus']>) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Active session
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // Streaming status
  isStreaming: boolean;
  setStreaming: (streaming: boolean) => void;

  // Language
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (theme) => set({ theme }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  wsClientCount: 0,
  setWsClientCount: (count) => set({ wsClientCount: count }),

  systemStatus: {
    configValid: false,
    processRunning: false,
    provider: 'unknown',
    uptime: 0,
  },
  setSystemStatus: (status) => set((s) => ({
    systemStatus: { ...s.systemStatus, ...status }
  })),

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration || 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),

  isStreaming: false,
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),
}));