import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const parserPath = join(process.cwd(), "src", "tli", "statParser.ts");

  const parserContent = `
import { useStatsStore } from "../store/statsStore";

// 정규식을 이용해 텍스트에서 숫자만 추출하는 헬퍼 함수
// 예: "+(40 - 50)" -> 50 (최대치 기준 추출) 또는 "120" -> 120
const extractNumber = (text: string): number => {
  // 숫자, 소수점, 마이너스 기호를 찾음
  const matches = text.match(/-?\d+(\.\d+)?/g);
  if (!matches) return 0;
  // 범위 값일 경우 뒷 숫자(최대치)를 가져오거나, 단일 숫자면 그 숫자를 가져옴
  return parseFloat(matches[matches.length - 1]);
};

// 장비의 옵션(Affix) 텍스트를 읽어서 상태 저장소(Store)에 수치를 더해주는 핵심 함수
export const parseAndApplyAffix = (affixText: string) => {
  const { addFlat, addIncreased, addMore, addBase } = useStatsStore.getState();
  const text = affixText.toLowerCase(); // 비교를 쉽게 하기 위해 소문자로 변환 (영문/한글 혼용 대비)
  const value = extractNumber(text);

  if (value === 0) return; // 숫자가 없는 옵션은 스킵

  // 1. 생명력 (Life) 옵션 파싱
  if (text.includes("최대 생명력") || text.includes("최대 hp")) {
    if (text.includes("추가 증가") || text.includes("more")) {
      addMore("maxLife", 1 + (value / 100)); // 5% 추가 증가 -> 1.05 곱산
    } else if (text.includes("%")) {
      addIncreased("maxLife", value / 100);  // 10% 증가 -> 0.1 합산
    } else {
      addFlat("maxLife", value);             // +50 -> 50 합산
    }
    return;
  }

  // 2. 마나 (Mana) 옵션 파싱
  if (text.includes("최대 마나") || text.includes("최대 mp")) {
    if (text.includes("%")) addIncreased("maxMana", value / 100);
    else addFlat("maxMana", value);
    return;
  }

  // 3. 스탯 (힘/민첩/지능) 옵션 파싱
  if (text.includes("힘") || text.includes("strength") || text.includes("str")) {
    if (text.includes("%")) addIncreased("str", value / 100);
    else addFlat("str", value);
    return;
  }
  if (text.includes("민첩") || text.includes("dexterity") || text.includes("dex")) {
    if (text.includes("%")) addIncreased("dex", value / 100);
    else addFlat("dex", value);
    return;
  }
  if (text.includes("지능") || text.includes("intelligence") || text.includes("int")) {
    if (text.includes("%")) addIncreased("int", value / 100);
    else addFlat("int", value);
    return;
  }

  // TODO: 저항력(Res), 방어도(Armor), 회피(Evasion) 등 계속해서 규칙을 추가해 나갑니다.
};

// 캐릭터가 장착한 모든 장비와 석판을 한 번에 계산하는 함수
export const recalculateAllStats = (equippedItems: any[]) => {
  const { resetStats } = useStatsStore.getState();
  
  // 1. 과거 기록 초기화
  resetStats();

  // TODO: 2. 캐릭터 레벨에 따른 기본 스탯(Base) 주입 로직 추가 위치
  // useStatsStore.getState().addBase("maxLife", 1000);

  // 3. 장착된 모든 아이템의 옵션을 순회하며 파싱
  for (const item of equippedItems) {
    if (!item) continue;
    
    // 고정 속성 (Implicit)
    item.implicits?.forEach((affix: string) => parseAndApplyAffix(affix));
    
    // 무작위 속성 (Explicit)
    item.affixes?.forEach((affix: string) => parseAndApplyAffix(affix));
  }
};
`;

  await writeFile(parserPath, parserContent.trim(), "utf-8");
  console.log("✅ src/tli/statParser.ts (스탯 파서 엔진) 생성 완료");

  try {
    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 파서 엔진 생성 성공!");
  } catch (e) {
    console.error("포맷팅 중 오류가 발생했습니다.");
  }
};

main().catch(console.error);
