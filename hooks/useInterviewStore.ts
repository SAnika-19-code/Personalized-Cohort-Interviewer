import { create } from "zustand";
import type {
  AppScreen,
  CandidateProfile,
  Curriculum,
  InterviewSession,
  InterviewReport,
  ChatMessage,
} from "@/types";

interface InterviewStore {
  screen: AppScreen;
  curriculum: Curriculum | null;
  candidateProfile: CandidateProfile | null;
  session: InterviewSession | null;
  report: InterviewReport | null;
  isLoading: boolean;
  error: string | null;

  setCurriculum: (curriculum: Curriculum) => void;
  setCandidateProfile: (profile: CandidateProfile) => void;
  setScreen: (screen: AppScreen) => void;
  setSession: (session: InterviewSession) => void;
  setReport: (report: InterviewReport) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addMessages: (messages: ChatMessage[]) => void;
  reset: () => void;
}

const initialState = {
  screen: "setup" as AppScreen,
  curriculum: null,
  candidateProfile: null,
  session: null,
  report: null,
  isLoading: false,
  error: null,
};

export const useInterviewStore = create<InterviewStore>((set) => ({
  ...initialState,

  setCurriculum: (curriculum) => set({ curriculum }),
  setCandidateProfile: (profile) => set({ candidateProfile: profile }),
  setScreen: (screen) => set({ screen }),
  setSession: (session) => set({ session }),
  setReport: (report) => set({ report }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addMessages: (messages) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            conversationHistory: [
              ...state.session.conversationHistory,
              ...messages,
            ],
          }
        : null,
    })),
  reset: () => set(initialState),
}));
