import { create } from 'zustand';
import type { Aluno, Turma, Frequencia, User } from '../types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;

  // Theme
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;

  // Data
  alunos: Aluno[];
  setAlunos: (alunos: Aluno[]) => void;
  turmas: Turma[];
  setTurmas: (turmas: Turma[]) => void;
  frequencias: Frequencia[];
  setFrequencias: (frequencias: Frequencia[]) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }>;
  addNotification: (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  isAuthenticated: false,
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),

  // Theme
  isDarkMode: localStorage.getItem('isDarkMode') === 'true' || false,
  setIsDarkMode: (value) => {
    localStorage.setItem('isDarkMode', String(value));
    set({ isDarkMode: value });
  },

  // Data
  alunos: [],
  setAlunos: (alunos) => set({ alunos }),
  turmas: [],
  setTurmas: (turmas) => set({ turmas }),
  frequencias: [],
  setFrequencias: (frequencias) => set({ frequencias }),

  // Loading
  isLoading: false,
  setIsLoading: (value) => set({ isLoading: value }),

  // Notifications
  notifications: [],
  addNotification: (message, type, duration = 3000) =>
    set((state) => {
      const id = Date.now().toString();
      const newNotifications = [...state.notifications, { id, type, message, duration }];
      if (duration) {
        setTimeout(() => {
          set((s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
          }));
        }, duration);
      }
      return { notifications: newNotifications };
    }),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
