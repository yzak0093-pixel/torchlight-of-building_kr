import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const parserPath = join(process.cwd(), "src", "tli", "statParser.ts");
  let content = await readFile(parserPath, "utf-8");

  // 기존 파서 로직을 정교한 정규식과 한글/영문 호환 로직으로 교체
  const newParserLogic = `export const parseAndApplyAffix = (affixText: string) => {
  const { addFlat, addIncreased, addMore } = useStatsStore.getState();
  const text = affixText.toLowerCase();
  const value = extractNumber(text);

  if (value === 0) return;

  // 1. 생명력 (Life) / HP
  if (text.includes("최대 생명력") || text.includes("hp")) {
    if (text.includes("추가 증가") || text.includes("more")) addMore("maxLife", 1 + (value / 100));
    else if (text.includes("%")) addIncreased("maxLife", value / 100);
    else addFlat("maxLife", value);
    return;
  }

  // 2. 마나 (Mana) / MP
  if (text.includes("최대 마나") || text.includes("mp")) {
    if (text.includes("%")) addIncreased("maxMana", value / 100);
    else addFlat("maxMana", value);
    return;
  }

  // 3. 회피 (Evasion) - 스크린샷 장비 대응
  if (text.includes("회피") || text.includes("evasion")) {
    if (text.includes("%")) addIncreased("evasion", value / 100);
    else addFlat("evasion", value);
    return;
  }

  // 4. 공격 속도 (Attack Speed) - 스크린샷 장비 대응
  if (text.includes("공격 속도") || text.includes("attack speed")) {
    // 공격 속도는 마이너스(-) 값도 있으므로 주의
    if (text.includes("%")) addIncreased("attackSpeed", value / 100);
    else addFlat("attackSpeed", value);
    return;
  }

  // 5. 스탯 (힘/민첩/지능)
  if (text.includes("힘") || text.includes("str")) {
    if (text.includes("%")) addIncreased("str", value / 100);
    else addFlat("str", value); return;
  }
  if (text.includes("민첩") || text.includes("dex")) {
    if (text.includes("%")) addIncreased("dex", value / 100);
    else addFlat("dex", value); return;
  }
  if (text.includes("지능") || text.includes("int")) {
    if (text.includes("%")) addIncreased("int", value / 100);
    else addFlat("int", value); return;
  }
};`;

  // 기존 함수 블록 교체
  content = content.replace(
    /export const parseAndApplyAffix = \([\s\S]*?\n\};/m,
    newParserLogic,
  );

  await writeFile(parserPath, content, "utf-8");
  console.log(
    "✅ statParser.ts에 '회피', 'HP', '공격 속도' 등 한글 규칙 업데이트 완료!",
  );

  try {
    execSync("pnpm format", { stdio: "inherit" });
  } catch (e) {
    console.log("포맷팅 스킵");
  }
};

main().catch(console.error);
