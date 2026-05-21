import { create } from "zustand";
import {
  type CharacterStats,
  createEmptyStats,
  calculateFinalStat,
} from "../tli/stats";

interface StatsState {
  // 현재 계산 진행 중인 raw 데이터
  rawStats: CharacterStats;

  // 외부에서 옵션을 주입할 때 사용하는 액션
  // 예: addFlat("maxLife", 50)
  addBase: (key: keyof CharacterStats, value: number) => void;
  addFlat: (key: keyof CharacterStats, value: number) => void;
  addIncreased: (key: keyof CharacterStats, value: number) => void; // 10% = 0.1
  addMore: (key: keyof CharacterStats, multiplier: number) => void; // 5% More = 1.05

  // 모든 스탯 초기화 (장비 변경 시 전체 재계산용)
  resetStats: () => void;

  // UI에서 호출하여 최종 결과값만 뽑아가는 헬퍼
  getFinal: (key: keyof CharacterStats) => number;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  rawStats: createEmptyStats(),

  addBase: (key, value) =>
    set((state) => ({
      rawStats: {
        ...state.rawStats,
        [key]: {
          ...state.rawStats[key],
          base: state.rawStats[key].base + value,
        },
      },
    })),

  addFlat: (key, value) =>
    set((state) => ({
      rawStats: {
        ...state.rawStats,
        [key]: {
          ...state.rawStats[key],
          flat: state.rawStats[key].flat + value,
        },
      },
    })),

  addIncreased: (key, value) =>
    set((state) => ({
      rawStats: {
        ...state.rawStats,
        [key]: {
          ...state.rawStats[key],
          increased: state.rawStats[key].increased + value,
        },
      },
    })),

  addMore: (key, multiplier) =>
    set((state) => ({
      rawStats: {
        ...state.rawStats,
        [key]: {
          ...state.rawStats[key],
          more: [...state.rawStats[key].more, multiplier],
        },
      },
    })),

  resetStats: () => set({ rawStats: createEmptyStats() }),

  getFinal: (key) => {
    const mods = get().rawStats[key];
    return calculateFinalStat(mods);
  },
}));
