import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const parserPath = join(process.cwd(), "src", "tli", "statParser.ts");

  const newParserContent = `import { useStatsStore } from "../store/statsStore";
import type { StatKey } from "./stats";

// 숫자 추출 헬퍼 (마이너스 기호 및 소수점 완벽 지원)
const extractNumber = (text: string): number => {
  const matches = text.match(/-?\d+(\.\d+)?/g);
  if (!matches) return 0;
  return parseFloat(matches[matches.length - 1]);
};

// ============================================================================
// 옵션 매칭 사전 (Dictionary)
// 나중에 새로운 옵션이 생기면 이 배열에 한 줄씩만 추가하면 됩니다.
// ============================================================================
interface StatRule {
  keywords: string[];
  targetKey: StatKey | string; // 추후 StatKey에 없는 커스텀 스탯도 유연하게 수용
}

const STAT_DICTIONARY: StatRule[] = [
  // 1. 기본 자원
  { keywords: ["최대 생명력", "최대 hp"], targetKey: "maxLife" },
  { keywords: ["최대 마나", "최대 mp"], targetKey: "maxMana" },
  { keywords: ["보호막", "energy shield"], targetKey: "energyShield" },
  
  // 2. 방어 기제
  { keywords: ["방어도", "armor"], targetKey: "armor" },
  { keywords: ["회피", "evasion"], targetKey: "evasion" },
  { keywords: ["공격 막기", "attack block"], targetKey: "attackBlock" },
  { keywords: ["주술 막기", "spell block"], targetKey: "spellBlock" },
  { keywords: ["막기 비율", "block ratio"], targetKey: "blockRatio" },
  
  // 3. 저항
  { keywords: ["냉기 저항", "cold res"], targetKey: "coldRes" },
  { keywords: ["번개 저항", "lightning res"], targetKey: "lightningRes" },
  { keywords: ["화염 저항", "fire res"], targetKey: "fireRes" },
  { keywords: ["부식 저항", "erosion res"], targetKey: "erosionRes" },
  
  // 4. 스탯 (능력치)
  { keywords: ["힘", "str"], targetKey: "str" },
  { keywords: ["민첩", "dex"], targetKey: "dex" },
  { keywords: ["지능", "지혜", "int"], targetKey: "int" },
  
  // 5. 공격 관련 (임시 - 나중에 stats.ts에 추가 필요)
  { keywords: ["공격 속도", "attack speed"], targetKey: "attackSpeed" },
  { keywords: ["크리티컬 대미지", "치명타 피해"], targetKey: "critDamage" },
  { keywords: ["크리티컬 확률", "치명타 확률"], targetKey: "critChance" },
];

// ============================================================================
// 코어 파서 엔진
// ============================================================================
export const parseAndApplyAffix = (affixText: string) => {
  const { addFlat, addIncreased, addMore } = useStatsStore.getState();
  const text = affixText.toLowerCase();
  const value = extractNumber(text);

  if (value === 0) return; // 숫자가 없는 옵션(예: 특정 스킬 사용 가능)은 스킵

  // 단어장(Dictionary)을 순회하며 매칭 검사
  for (const rule of STAT_DICTIONARY) {
    if (rule.keywords.some(keyword => text.includes(keyword))) {
      const key = rule.targetKey as any; // 타입 에러 우회

      // 연산자(Modifier) 판별 로직
      if (text.includes("추가") || text.includes("more")) {
        // "5% 추가 증가" -> 1.05 곱산
        addMore(key, 1 + (value / 100));
      } else if (text.includes("%")) {
        // "10% 증가" -> 0.1 합산 (공격 속도 등은 마이너스 값도 여기서 처리됨)
        addIncreased(key, value / 100);
      } else {
        // "+50" -> 50 합산
        addFlat(key, value);
      }
      return; // 매칭 성공 시 해당 줄 파싱 종료
    }
  }
  
  // 단어장에 없는 옵션이면 무시 (콘솔에 남겨서 나중에 확인 가능)
  // console.warn("Unrecognized affix:", affixText);
};

export const recalculateAllStats = (equippedItems: any[]) => {
  const { resetStats } = useStatsStore.getState();
  resetStats();

  for (const item of equippedItems) {
    if (!item) continue;
    item.implicits?.forEach((affix: string) => parseAndApplyAffix(affix));
    item.affixes?.forEach((affix: string) => parseAndApplyAffix(affix));
    // 100레벨 추가 옵션 등 커스텀 옵션 배열이 있다면 여기에 추가
  }
};
`;

  await writeFile(parserPath, newParserContent.trim(), "utf-8");
  console.log("✅ 스탯 파서 V3 (사전 매칭 시스템) 업데이트 완료!");

  try {
    execSync("pnpm format", { stdio: "inherit" });
  } catch (e) {}
};

main().catch(console.error);
