import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  // 디렉토리 강제 생성
  await mkdir(join(process.cwd(), "src", "tli"), { recursive: true });
  await mkdir(join(process.cwd(), "src", "store"), { recursive: true });

  // 1. src/tli/stats.ts - 스탯 타입 및 계산 코어 엔진
  const statsCorePath = join(process.cwd(), "src", "tli", "stats.ts");
  const statsCoreContent = `
// 스크린샷에 기반한 기본 스탯 키값들 (앞으로 계속 추가될 예정)
export type StatKey =
  | "str" | "dex" | "int"
  | "maxLife" | "maxMana" | "energyShield"
  | "armor" | "evasion"
  | "coldRes" | "lightningRes" | "fireRes" | "erosionRes"
  | "attackBlock" | "spellBlock" | "blockRatio";

// ARPG 계산의 핵심 4단계 구조체
export interface StatModifiers {
  base: number;      // 레벨 비례 등 기본 수치
  flat: number;      // +50 최대 생명력 등 합산 수치
  increased: number; // 10% 증가 등 (0.1로 표기)
  more: number[];    // 5% 추가 증가 등 (독립 곱산이므로 배열로 관리, 예: [1.05])
}

// 모든 스탯을 담는 컨테이너 타입
export type CharacterStats = Record<StatKey, StatModifiers>;

// 팩토리: 빈 스탯 컨테이너 생성
export const createEmptyStats = (): CharacterStats => {
  const emptyMod = (): StatModifiers => ({ base: 0, flat: 0, increased: 0, more: [] });
  return {
    str: emptyMod(), dex: emptyMod(), int: emptyMod(),
    maxLife: emptyMod(), maxMana: emptyMod(), energyShield: emptyMod(),
    armor: emptyMod(), evasion: emptyMod(),
    coldRes: emptyMod(), lightningRes: emptyMod(), fireRes: emptyMod(), erosionRes: emptyMod(),
    attackBlock: emptyMod(), spellBlock: emptyMod(), blockRatio: emptyMod(),
  };
};

// 핵심: 개별 스탯의 최종 값 계산 공식
// 공식: (Base + Flat) * (1 + Increased) * More1 * More2 ...
export const calculateFinalStat = (mod: StatModifiers): number => {
  let total = (mod.base + mod.flat) * (1 + mod.increased);
  for (const m of mod.more) {
    total *= m;
  }
  return total;
};
`;
  await writeFile(statsCorePath, statsCoreContent.trim(), "utf-8");
  console.log("✅ src/tli/stats.ts (스탯 코어 엔진) 생성 완료");

  // 2. src/store/statsStore.ts - 전역 상태 관리 (Zustand)
  const storePath = join(process.cwd(), "src", "store", "statsStore.ts");
  const storeContent = `
import { create } from "zustand";
import { type CharacterStats, createEmptyStats, calculateFinalStat } from "../tli/stats";

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

  addBase: (key, value) => set((state) => ({
    rawStats: { ...state.rawStats, [key]: { ...state.rawStats[key], base: state.rawStats[key].base + value } }
  })),

  addFlat: (key, value) => set((state) => ({
    rawStats: { ...state.rawStats, [key]: { ...state.rawStats[key], flat: state.rawStats[key].flat + value } }
  })),

  addIncreased: (key, value) => set((state) => ({
    rawStats: { ...state.rawStats, [key]: { ...state.rawStats[key], increased: state.rawStats[key].increased + value } }
  })),

  addMore: (key, multiplier) => set((state) => ({
    rawStats: { ...state.rawStats, [key]: { ...state.rawStats[key], more: [...state.rawStats[key].more, multiplier] } }
  })),

  resetStats: () => set({ rawStats: createEmptyStats() }),

  getFinal: (key) => {
    const mods = get().rawStats[key];
    return calculateFinalStat(mods);
  }
}));
`;
  await writeFile(storePath, storeContent.trim(), "utf-8");
  console.log("✅ src/store/statsStore.ts (상태 저장소) 생성 완료");

  try {
    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 스탯 코어 시스템 구축 완료!");
  } catch (e) {
    console.error("포맷팅 중 오류가 발생했습니다.");
  }
};

main().catch(console.error);
