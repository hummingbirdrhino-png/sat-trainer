import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Question, UserAnswer, UserSkill, SessionSummary, Bookmark,
  PracticeSession,
  AppSettings, DailyGoal, Highlight, AuthUser
} from '@/types';

interface AppState {
  // Questions bank
  questions: Question[];
  setQuestions: (questions: Question[]) => void;

  // Current user
  userId: string | null;
  displayName: string;
  users: AuthUser[];
  login: (email: string, password: string) => { ok: boolean; message: string };
  register: (name: string, email: string, password: string) => { ok: boolean; message: string };
  logout: () => void;
  setUserId: (id: string | null) => void;
  setDisplayName: (name: string) => void;
  isPro: boolean;
  unlockProDemo: () => void;

  // Practice session
  currentSession: PracticeSession | null;
  setCurrentSession: (session: PracticeSession | null) => void;
  updateSessionAnswer: (answer: UserAnswer) => void;
  toggleMarkedForReview: (questionId: string) => void;

  // User data
  userAnswers: UserAnswer[];
  addUserAnswer: (answer: UserAnswer) => void;
  userSkills: Record<string, UserSkill>;
  updateUserSkill: (skill: string, update: Partial<UserSkill>) => void;
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (questionId: string) => void;
  sessionSummaries: SessionSummary[];
  addSessionSummary: (summary: SessionSummary) => void;
  highlights: Highlight[];
  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (id: string) => void;

  // Daily goals
  dailyGoals: DailyGoal[];
  updateDailyGoal: (goal: DailyGoal) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  fontFamily: 'sans',
  fontSize: 'medium',
  dailyGoalTarget: 20,
  notificationsEnabled: false,
  reminderTime: '18:00',
  aiExplanationsEnabled: true,
  targetSatScore: 700,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Questions
      questions: [],
      setQuestions: (questions) => set({ questions }),

      // User
      userId: null,
      displayName: 'Student',
      users: [],
      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email.toLowerCase() === normalizedEmail && u.password === password);

        if (!user) {
          return { ok: false, message: 'No account found with that email and password.' };
        }

        set({ userId: user.id, displayName: user.name });
        return { ok: true, message: 'Logged in.' };
      },
      register: (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase();

        if (get().users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return { ok: false, message: 'An account already exists for that email.' };
        }

        if (password.length < 4) {
          return { ok: false, message: 'Password must be at least 4 characters.' };
        }

        const user: AuthUser = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          password,
          createdAt: Date.now(),
        };

        set((state) => ({
          users: [...state.users, user],
          userId: user.id,
          displayName: user.name,
        }));
        return { ok: true, message: 'Account created.' };
      },
      logout: () => set({ userId: null, displayName: 'Student', currentSession: null }),
      setUserId: (id) => set({ userId: id }),
      setDisplayName: (name) => set({ displayName: name }),
      isPro: false,
      unlockProDemo: () => set({ isPro: true }),

      // Session
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),
      updateSessionAnswer: (answer) => {
        const session = get().currentSession;
        if (!session) return;
        set({
          currentSession: {
            ...session,
            answers: { ...session.answers, [answer.questionId]: answer },
          },
        });
      },
      toggleMarkedForReview: (questionId) => {
        const session = get().currentSession;
        if (!session) return;
        const marked = session.markedForReview.includes(questionId)
          ? session.markedForReview.filter((id) => id !== questionId)
          : [...session.markedForReview, questionId];
        set({ currentSession: { ...session, markedForReview: marked } });
      },

      // User data
      userAnswers: [],
      addUserAnswer: (answer) =>
        set((state) => ({
          userAnswers: [
            ...state.userAnswers.filter(
              (existing) => !(existing.sessionId === answer.sessionId && existing.questionId === answer.questionId)
            ),
            answer,
          ],
        })),
      userSkills: {},
      updateUserSkill: (skill, update) =>
        set((state) => ({
          userSkills: {
            ...state.userSkills,
            [skill]: { ...state.userSkills[skill], ...update, skill },
          },
        })),
      bookmarks: [],
      addBookmark: (bookmark) =>
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] })),
      removeBookmark: (questionId) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.questionId !== questionId),
        })),
      sessionSummaries: [],
      addSessionSummary: (summary) =>
        set((state) => ({
          sessionSummaries: [summary, ...state.sessionSummaries],
        })),
      highlights: [],
      addHighlight: (highlight) =>
        set((state) => ({ highlights: [...state.highlights, highlight] })),
      removeHighlight: (id) =>
        set((state) => ({
          highlights: state.highlights.filter((h) => h.id !== id),
        })),

      // Daily goals
      dailyGoals: [],
      updateDailyGoal: (goal) =>
        set((state) => {
          const existing = state.dailyGoals.find((g) => g.date === goal.date);
          if (existing) {
            return {
              dailyGoals: state.dailyGoals.map((g) =>
                g.date === goal.date ? { ...g, ...goal } : g
              ),
            };
          }
          return { dailyGoals: [...state.dailyGoals, goal] };
        }),

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // UI
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      currentPage: 'home',
      setCurrentPage: (page) => set({ currentPage: page }),
    }),
    {
      name: 'sat-trainer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userAnswers: state.userAnswers,
        userSkills: state.userSkills,
        bookmarks: state.bookmarks,
        sessionSummaries: state.sessionSummaries,
        dailyGoals: state.dailyGoals,
        settings: state.settings,
        userId: state.userId,
        displayName: state.displayName,
        users: state.users,
        isPro: state.isPro,
        highlights: state.highlights,
      }),
    }
  )
);
