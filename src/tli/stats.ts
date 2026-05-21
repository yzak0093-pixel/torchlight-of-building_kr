// 스크린샷에 기반한 기본 스탯 키값들 (앞으로 계속 추가될 예정)
export type StatKey =
  | "str"
  | "dex"
  | "int"
  | "maxLife"
  | "maxMana"
  | "energyShield"
  | "armor"
  | "evasion"
  | "coldRes"
  | "lightningRes"
  | "fireRes"
  | "erosionRes"
  | "attackBlock"
  | "spellBlock"
  | "blockRatio";

// ARPG 계산의 핵심 4단계 구조체
export interface StatModifiers {
  base: number; // 레벨 비례 등 기본 수치
  flat: number; // +50 최대 생명력 등 합산 수치
  increased: number; // 10% 증가 등 (0.1로 표기)
  more: number[]; // 5% 추가 증가 등 (독립 곱산이므로 배열로 관리, 예: [1.05])
}

// 모든 스탯을 담는 컨테이너 타입
export type CharacterStats = Record<StatKey, StatModifiers>;

// 팩토리: 빈 스탯 컨테이너 생성
export const createEmptyStats = (): CharacterStats => {
  const emptyMod = (): StatModifiers => ({
    base: 0,
    flat: 0,
    increased: 0,
    more: [],
  });
  return {
    str: emptyMod(),
    dex: emptyMod(),
    int: emptyMod(),
    maxLife: emptyMod(),
    maxMana: emptyMod(),
    energyShield: emptyMod(),
    armor: emptyMod(),
    evasion: emptyMod(),
    coldRes: emptyMod(),
    lightningRes: emptyMod(),
    fireRes: emptyMod(),
    erosionRes: emptyMod(),
    attackBlock: emptyMod(),
    spellBlock: emptyMod(),
    blockRatio: emptyMod(),
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
