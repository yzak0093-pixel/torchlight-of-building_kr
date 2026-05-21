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
  const funcRegex = /export const translateAffixToEn = \([\s\S]+$/;

  const newFunc = `export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 🚀 [최우선 순위: 확정된 정답 강제 변환 (Supreme Override)]
  // 패턴 맵의 오작동을 막기 위해, 확인된 100% 정답을 가장 먼저 리턴해버립니다.
  
  // 1. 기본 스탯 (HP, MP, 보호막)
  if (/^최대\\s*HP\\s*\\+?\\s*(\\d+)$/.test(t)) return t.replace(/^최대\\s*HP\\s*\\+?\\s*(\\d+)$/, "+$1 Max Life");
  if (/^최대\\s*HP\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^최대\\s*HP\\s*\\+?\\s*(\\d+)%$/, "+$1% Max Life");
  if (/^최대\\s*MP\\s*\\+?\\s*(\\d+)$/.test(t)) return t.replace(/^최대\\s*MP\\s*\\+?\\s*(\\d+)$/, "+$1 Max Mana");
  if (/^최대\\s*MP\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^최대\\s*MP\\s*\\+?\\s*(\\d+)%$/, "+$1% Max Mana");
  if (/^해당\\s*장비\\s*보호막\\s*\\+?\\s*(\\d+)$/.test(t)) return t.replace(/^해당\\s*장비\\s*보호막\\s*\\+?\\s*(\\d+)$/, "+$1 Gear Energy Shield");
  if (/^해당\\s*장비\\s*보호막\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^해당\\s*장비\\s*보호막\\s*\\+?\\s*(\\d+)%$/, "+$1% Gear Energy Shield");
  
  // 2. 특수 스탯 (저주, 회피, 회복 등 스크린샷 에러 항목들)
  if (/^추가\\s*저주를\\s*(\\d+)\\s*개\\s*시전할\\s*수\\s*있다\\.?$/.test(t)) return t.replace(/^추가\\s*저주를\\s*(\\d+)\\s*개\\s*시전할\\s*수\\s*있다\\.?$/, "You can cast $1 additional Curses");
  if (/^크리티컬\\s*대미지\\s*감면\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^크리티컬\\s*대미지\\s*감면\\s*\\+?\\s*(\\d+)%$/, "+$1% Critical Strike Damage Mitigation");
  if (/^\\+?\\s*(\\d+)%\\s*의\\s*확률로\\s*원소\\s*상태\\s*이상을\\s*회피한다\\.?$/.test(t)) return t.replace(/^\\+?\\s*(\\d+)%\\s*의\\s*확률로\\s*원소\\s*상태\\s*이상을\\s*회피한다\\.?$/, "+$1% chance to avoid Elemental Ailments");
  if (/^MP\\s*자연\\s*회복\\s*속도\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^MP\\s*자연\\s*회복\\s*속도\\s*\\+?\\s*(\\d+)%$/, "+$1% Mana Regeneration Speed");
  if (/^최대\\s*보호막\\s*추가\\s*\\+?\\s*(\\d+)%$/.test(t)) return t.replace(/^최대\\s*보호막\\s*추가\\s*\\+?\\s*(\\d+)%$/, "+$1% additional Max Energy Shield");

  // ----------------------------------------------------
  // 완벽 일치 매칭 (위에서 안 걸린 것들)
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  // 패턴({N}) 매칭 (위에서 안 걸린 것들)
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

  // 최후의 보루 (나머지 예외 처리)
  t = t.replace(/보호막 에너지 충전 속도 \\+?(\\d+)%/, "+$1% Energy Shield Charge Speed");
  t = t.replace(/오라 효과 \\+?(\\d+)%/, "+$1% Aura Effect");
  t = t.replace(/MP 봉인 보상 \\+?(\\d+)%/, "+$1% Sealed Mana Compensation");
  t = t.replace(/받은 부식 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "Converts $1% of Erosion Damage Taken to Cold Damage");
  t = t.replace(/레벨 화염 충전을 보유한다/, "Charged Flames");
  
  return t;
};
`;

  content = content.replace(funcRegex, newFunc);
  await writeFile(MAP_FILE, content, "utf-8");
  console.log(
    "✅ 최우선 강제 변환(Supreme Override) 패치가 성공적으로 적용되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
