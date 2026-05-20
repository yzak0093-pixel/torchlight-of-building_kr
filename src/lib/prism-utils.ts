import { Prisms } from "@/src/data/prism/prisms";
import type { PrismRarity } from "./save-data";

export interface PrismAffix {
  type: string;
  rarity: string;
  affix: string;
}

const PHANTASMAGORIA_AFFIX = "+75% to the effects of Random Affixes on this Prism";

export const getBaseAffixes = (rarity: PrismRarity): PrismAffix[] => {
  const seen = new Set<string>();
  return Prisms.filter((p) => {
    if (p.type !== "Base Affix") return false;

    // 영어와 한국어 조건을 모두 통과하도록 수정
    const isEngRare = p.affix.startsWith("Adds");
    const isKoRare = p.affix.includes("추가 효과 부여");
    const isEngLeg = p.affix.startsWith("Replaces") || p.affix === PHANTASMAGORIA_AFFIX;
    const isKoLeg = p.affix.includes("핵심 재능 바꾸기") || p.affix.includes("랜덤 옵션의 효과");

    if (rarity === "rare" && !(isEngRare || isKoRare)) return false;
    if (rarity === "legendary" && !(isEngLeg || isKoLeg)) return false;

    if (seen.has(p.affix)) return false;
    seen.add(p.affix);
    return true;
  });
};

export const getRareGaugeAffixes = (): PrismAffix[] => {
  const seen = new Set<string>();
  return Prisms.filter((p) => {
    if (p.type !== "Prism Gauge" || p.rarity !== "Rare") return false;
    if (seen.has(p.affix)) return false;
    seen.add(p.affix);
    return true;
  });
};

export const getLegendaryGaugeAffixes = (): PrismAffix[] => {
  const seen = new Set<string>();
  return Prisms.filter((p) => {
    if (p.type !== "Prism Gauge" || p.rarity !== "Legendary") return false;
    if (seen.has(p.affix)) return false;
    seen.add(p.affix);
    return true;
  });
};

export const getMaxRareGaugeAffixes = (): number => 1;
export const getMaxLegendaryGaugeAffixes = (rarity: PrismRarity): number => (rarity === "legendary" ? 1 : 0);

export const getAreaAffixes = (): PrismAffix[] => {
  const seen = new Set<string>();
  return Prisms.filter((p) => {
    const isEngArea = p.type === "Random Affix" && p.affix.startsWith("The Effect Area expands to");
    const isKoArea = p.type === "Prism Area" || p.affix.includes("범위가") || p.affix.includes("영역");
    if (!(isEngArea || isKoArea)) return false;
    if (seen.has(p.affix)) return false;
    seen.add(p.affix);
    return true;
  });
};

export const getMutationAffixes = (): PrismAffix[] => {
  const seen = new Set<string>();
  return Prisms.filter((p) => {
    const isEngMut = p.type === "Random Affix" && p.affix.includes("Mutated Core Talents");
    const isKoMut = p.type === "Mutation" || p.affix.includes("돌연변이");
    if (!(isEngMut || isKoMut)) return false;
    if (seen.has(p.affix)) return false;
    seen.add(p.affix);
    return true;
  });
};

export const REPLACES_CORE_TALENT_PREFIX = "Replaces the Core Talent on the God of Might/Goddess of Hunting/Goddess of Knowledge/God of War/Goddess of Deception/God of Machines Advanced Talent Panel with ";
export const ADDS_CORE_TALENT_DELIMITER = "Advanced Talent Panel:\n";

// 긴 한글 텍스트에서 드롭다운에 예쁘게 보일 이름만 쏙 뽑아내는 로직 추가
export const extractReplacementName = (baseAffix: string): string | undefined => {
  if (baseAffix.startsWith(REPLACES_CORE_TALENT_PREFIX)) {
    return baseAffix.slice(REPLACES_CORE_TALENT_PREFIX.length);
  }
  const koMatch = baseAffix.match(/(.+?)\(으\)로\s+힘의/);
  if (koMatch) return koMatch[1].trim();
  return undefined;
};

export const extractAdditionalEffect = (baseAffix: string): string | undefined => {
  if (baseAffix.startsWith("Adds an additional effect")) {
    const delimiterIndex = baseAffix.indexOf(ADDS_CORE_TALENT_DELIMITER);
    if (delimiterIndex !== -1) return baseAffix.slice(delimiterIndex + ADDS_CORE_TALENT_DELIMITER.length);
  }
  const koMatch = baseAffix.match(/추가 효과 부여:?\s*\n?([\s\S]+)/);
  if (koMatch) return koMatch[1].trim();
  return undefined;
};

export const getBaseAffixLabel = (baseAffix: string): string => {
  if (baseAffix === PHANTASMAGORIA_AFFIX || baseAffix.includes("랜덤 옵션의 효과 +75%")) return "Phantasmagoria (랜덤 옵션 효과 +75%)";
  const additional = extractAdditionalEffect(baseAffix);
  if (additional !== undefined) return additional.replaceAll("\n", " / ");
  const replacement = extractReplacementName(baseAffix);
  if (replacement !== undefined) return replacement;
  return baseAffix.split("\n")[0];
};

export interface PrismArea { w: number; h: number; anchorCol: number; anchorRow: number; }
const PRISM_AREAS: Record<string, PrismArea> = {
  "3x3": { w: 3, h: 3, anchorCol: 1, anchorRow: 1 },
  "3x4": { w: 3, h: 4, anchorCol: 1, anchorRow: 1 },
  "4x3": { w: 4, h: 3, anchorCol: 1, anchorRow: 1 },
  "2x2": { w: 2, h: 2, anchorCol: 0, anchorRow: 0 },
  "7x1": { w: 7, h: 1, anchorCol: 3, anchorRow: 0 },
  "2x4": { w: 2, h: 4, anchorCol: 0, anchorRow: 1 },
  "4x2": { w: 4, h: 2, anchorCol: 1, anchorRow: 0 },
  "1x1": { w: 1, h: 1, anchorCol: 0, anchorRow: 0 },
};

export const getAreaFromDimensions = (dimensions: string | undefined): PrismArea => {
  if (dimensions === undefined) return PRISM_AREAS["1x1"];
  return PRISM_AREAS[dimensions] ?? PRISM_AREAS["1x1"];
};
