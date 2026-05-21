import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const MAP_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

const main = async () => {
  let content = await readFile(MAP_FILE, "utf-8");

  // 기존 번역 함수(translateAffixToEn)를 통째로 정교한 대소문자 버전으로 교체합니다.
  const funcRegex = /export const translateAffixToEn = \([\s\S]+$/;

  const newFunc = `export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 1. 완벽 일치 매칭
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  // 2. 패턴({N}) 매칭
  const numbers: string[] = [];
  const koPat = t.replace(/[+-]?\\d+(\\.\\d+)?/g, (n) => {
    numbers.push(n);
    return "{N}";
  }).replace(/\\s+/g, " ");

  const enPat = KO_EN_PATTERN_MAP[koPat];
  if (enPat) {
    let i = 0;
    return enPat.replace(/\\{N\\}/g, () => numbers[i++] || "");
  }

  // 3. 엔진이 요구하는 정확한 대소문자 및 복수형(s)을 반영한 최후의 보루
  
  // HP / MP / 보호막
  t = t.replace(/최대 HP \\+?(\\d+)%/, "+$1% Max Life");
  t = t.replace(/최대 HP \\+?(\\d+)/, "+$1 Max Life");
  t = t.replace(/최대 MP \\+?(\\d+)%/, "+$1% Max Mana");
  t = t.replace(/최대 MP \\+?(\\d+)/, "+$1 Max Mana");
  t = t.replace(/최대 보호막 \\+?(\\d+)/, "+$1 Max Energy Shield");
  t = t.replace(/최대 보호막 추가 \\+?(\\d+)%/, "+$1% additional Max Energy Shield");
  t = t.replace(/보호막 에너지 충전 속도 \\+?(\\d+)%/, "+$1% Energy Shield Charge Speed");
  
  // 저주 / 오라 / 봉인 보상
  t = t.replace(/추가 저주를 (\\d+)\\s*개 시전할 수 있다\\.?/, "You can cast $1 additional Curses");
  t = t.replace(/저주 효과 \\+?(\\d+)%/, "+$1% Curse Effect");
  t = t.replace(/오라 효과 \\+?(\\d+)%/, "+$1% Aura Effect");
  t = t.replace(/MP 봉인 보상 \\+?(\\d+)%/, "+$1% Sealed Mana Compensation");
  t = t.replace(/MP 자연 회복 속도 \\+?(\\d+)%/, "+$1% Mana Regeneration Speed");
  
  // 크리티컬 / 대미지 전환 / 상태 이상
  t = t.replace(/크리티컬 대미지 감면 \\+?(\\d+)%?/, "+$1% Critical Strike Damage Mitigation");
  t = t.replace(/받은 부식 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "Converts $1% of Erosion Damage Taken to Cold Damage");
  t = t.replace(/\\+?(\\d+)% 의 확률로 원소 상태 이상을 회피한다\\.?/, "+$1% chance to avoid Elemental Ailments");
  
  // 저항력
  t = t.replace(/냉기 저항 \\+?(\\d+)%?/, "+$1% Cold Resistance");
  t = t.replace(/화염 저항 \\+?(\\d+)%?/, "+$1% Fire Resistance");
  t = t.replace(/번개 저항 \\+?(\\d+)%?/, "+$1% Lightning Resistance");
  t = t.replace(/부식 저항 \\+?(\\d+)%?/, "+$1% Erosion Resistance");
  t = t.replace(/원소\\s*저항 \\+?(\\d+)%?/, "+$1% Elemental Resistance");
  
  t = t.replace(/레벨 화염 충전을 보유한다/, "Charged Flames");
  
  return t;
};
`;

  content = content.replace(funcRegex, newFunc);
  await writeFile(MAP_FILE, content, "utf-8");
  console.log(
    "✅ 정확한 영어 대소문자(Title Case)가 적용된 정규식으로 완벽하게 교체되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
