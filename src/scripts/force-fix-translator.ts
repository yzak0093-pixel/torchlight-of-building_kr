import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const mapPath = join(
    process.cwd(),
    "src",
    "tli",
    "mod-parser",
    "ko-en-affix-map.ts",
  );
  let content = await readFile(mapPath, "utf-8");

  // 기존 translateAffixToEn 함수를 완전히 날려버립니다.
  content = content.replace(/export const translateAffixToEn[\s\S]*$/, "");

  // 가장 확실한 정규식(Regex) 번역기를 통째로 새로 붙여넣습니다.
  const newFunc = `export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 1. 1:1 매핑 사전(KO_EN_AFFIX_MAP)에 있으면 즉시 영어 반환
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  // 2. 사전에 없는 '고유/기본 스탯'들을 정규식으로 강제 번역
  t = t.replace(/해당 장비 보호막 \\+?(\\d+)/, "+$1 gear energy shield");
  t = t.replace(/해당 장비 회피 수치 \\+?(\\d+)/, "+$1 gear evasion");
  t = t.replace(/해당 장비 방어도 \\+?(\\d+)/, "+$1 gear armor");
  t = t.replace(/최대 보호막 추가 \\+?(\\d+)%/, "+$1% additional max energy shield");
  t = t.replace(/최대 HP \\+?(\\d+)/, "+$1 max life");
  t = t.replace(/최대 MP \\+?(\\d+)/, "+$1 max mana");

  t = t.replace(/지혜 \\+?(\\d+)/, "+$1 intelligence");
  t = t.replace(/지능 \\+?(\\d+)/, "+$1 intelligence");
  t = t.replace(/민첩 \\+?(\\d+)/, "+$1 dexterity");
  t = t.replace(/힘 \\+?(\\d+)/, "+$1 strength");

  t = t.replace(/냉기 저항 \\+?(\\d+)%?/, "+$1% cold resistance");
  t = t.replace(/화염 저항 \\+?(\\d+)%?/, "+$1% fire resistance");
  t = t.replace(/번개 저항 \\+?(\\d+)%?/, "+$1% lightning resistance");
  t = t.replace(/부식 저항 \\+?(\\d+)%?/, "+$1% erosion resistance");
  t = t.replace(/원소\\s*저항 \\+?(\\d+)%?/, "+$1% elemental resistance");

  t = t.replace(/크리티컬 대미지 감면 \\+?(\\d+)%?/, "+$1% critical strike damage mitigation");
  t = t.replace(/크리티컬 수치 \\+?(\\d+)%?/, "+$1% critical strike rating");
  t = t.replace(/공격 및 주술 크리티컬 수치 \\+?(\\d+)/, "+$1 attack and spell critical strike rating");
  t = t.replace(/수확 회복 속도 \\+?(\\d+)%?/, "+$1% reap recovery speed");
  t = t.replace(/공격 속도 ([+-]?\\d+(?:\\.\\d+)?)%?/, "$1% attack speed");

  t = t.replace(/받은 물리 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "converts $1% of physical damage taken to cold damage");
  t = t.replace(/추가 저주를 (\\d+)\\s*개 시전할 수 있다\\./, "you can cast $1 additional curse(s)");

  return t;
};
`;

  await writeFile(mapPath, content + newFunc, "utf-8");
  console.log(
    "✅ ko-en-affix-map.ts에 강력한 정규식(Fallback) 번역기 강제 덮어쓰기 완료!",
  );

  try {
    execSync("pnpm format", { stdio: "inherit" });
  } catch (e) {}
};

main().catch(console.error);
