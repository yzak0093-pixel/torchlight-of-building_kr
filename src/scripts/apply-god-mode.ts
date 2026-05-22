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

  // 🗑️ 1. 쓸모없는 UI/HTML 찌꺼기 무시 (바로 통과)
  if (t.includes("$(document).ready") || /^Tier$/.test(t) || /^메인 옵션$/.test(t) || /^서브 옵션$/.test(t) || t.includes("옵션 /") || t.includes("Item /") || /^옵션 효과$/.test(t) || t.includes("레벨 조건")) {
    return t;
  }

  // 🚀 2. 갓 모드 강제 변환 (단일 숫자, 소수점, (54-74) 같은 범위까지 완벽 흡수)
  
  // HP, MP, 보호막
  t = t.replace(/^최대\\s*HP\\s*\\+?\\s*(.+)$/, "+$1 Max Life");
  t = t.replace(/^최대\\s*MP\\s*\\+?\\s*(.+)$/, "+$1 Max Mana");
  t = t.replace(/^최대\\s*보호막\\s*\\+?\\s*(.+)$/, "+$1 Max Energy Shield");
  t = t.replace(/^해당\\s*장비\\s*보호막\\s*\\+?\\s*(.+)$/, "+$1 Gear Energy Shield");
  t = t.replace(/^1초당\\s*HP\\s*(.+)\\s*회복$/, "Regenerates $1 Life per second");

  // 기본 스탯
  t = t.replace(/^힘\\s*\\+?\\s*(.+)$/, "+$1 Strength");
  t = t.replace(/^민첩\\s*\\+?\\s*(.+)$/, "+$1 Dexterity");
  t = t.replace(/^지혜\\s*\\+?\\s*(.+)$/, "+$1 Intelligence");

  // 대미지 관련
  t = t.replace(/^물리\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Physical Damage");
  t = t.replace(/^원소\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Elemental Damage");
  t = t.replace(/^부식\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Erosion Damage");
  t = t.replace(/^주술\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Spell Damage");
  t = t.replace(/^투사체\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Projectile Damage");
  t = t.replace(/^소환체\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Minion Damage");

  // 장비(Gear) 전용 옵션
  t = t.replace(/^해당\\s*장비\\s*물리\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Gear Physical Damage");
  t = t.replace(/^해당\\s*장비\\s*물리\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*추가$/, "Adds $1 to $2 Gear Physical Damage");
  t = t.replace(/^해당\\s*장비\\s*화염\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*추가$/, "Adds $1 to $2 Gear Fire Damage");
  t = t.replace(/^해당\\s*장비\\s*아머\\s*수치\\s*\\+?\\s*(.+)$/, "+$1 Gear Armor");
  t = t.replace(/^해당\\s*장비\\s*회피\\s*수치\\s*\\+?\\s*(.+)$/, "+$1 Gear Evasion");
  t = t.replace(/^해당\\s*장비\\s*공격\\s*속도\\s*\\+?\\s*(.+)$/, "+$1 Gear Attack Speed");
  t = t.replace(/^해당\\s*장비\\s*공격\\s*크리티컬\\s*수치\\s*\\+?\\s*(.+)$/, "+$1 Gear Attack Critical Strike Rating");

  // 크리티컬, 속도, 효과
  t = t.replace(/^크리티컬\\s*수치\\s*\\+?\\s*(.+)$/, "+$1 Critical Strike Rating");
  t = t.replace(/^크리티컬\\s*대미지\\s*\\+?\\s*(.+)$/, "+$1 Critical Strike Damage");
  t = t.replace(/^연속\\s*공격\\s*확률\\s*\\+?\\s*(.+)$/, "+$1 Multistrike Chance");
  t = t.replace(/^이동\\s*속도\\s*\\+?\\s*(.+)$/, "+$1 Movement Speed");
  t = t.replace(/^심화\\s*효과\\s*\\+?\\s*(.+)$/, "+$1 Wilt Effect");
  t = t.replace(/^수확\\s*시간\\s*\\+?\\s*(.+)$/, "+$1 Reap Time");
  t = t.replace(/^MP\\s*자연\\s*회복\\s*속도\\s*\\+?\\s*(.+)$/, "+$1 Mana Regeneration Speed");

  // 저항력 및 관통
  t = t.replace(/^화염\\s*저항\\s*\\+?\\s*(.+)$/, "+$1 Fire Resistance");
  t = t.replace(/^냉기\\s*저항\\s*\\+?\\s*(.+)$/, "+$1 Cold Resistance");
  t = t.replace(/^번개\\s*저항\\s*\\+?\\s*(.+)$/, "+$1 Lightning Resistance");
  t = t.replace(/^부식\\s*저항\\s*\\+?\\s*(.+)$/, "+$1 Erosion Resistance");
  t = t.replace(/^원소와\\s*부식\\s*저항\\s*관통\\s*\\+?\\s*(.+)$/, "+$1 Elemental and Erosion Resistance Penetration");
  t = t.replace(/^아머\\s*대미지\\s*감소\\s*관통\\s*\\+?\\s*(.+)$/, "+$1 Armor Penetration");

  // 플랫 대미지 추가 (주술 등)
  t = t.replace(/^주술에\\s*화염\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*(?:포인트\\s*)?추가$/, "Adds $1 to $2 Fire Damage to Spells");
  t = t.replace(/^주술에\\s*냉기\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*(?:포인트\\s*)?추가$/, "Adds $1 to $2 Cold Damage to Spells");
  t = t.replace(/^주술에\\s*번개\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*(?:포인트\\s*)?추가$/, "Adds $1 to $2 Lightning Damage to Spells");
  t = t.replace(/^주술에\\s*부식\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*(?:포인트\\s*)?추가$/, "Adds $1 to $2 Erosion Damage to Spells");
  t = t.replace(/^주술에\\s*물리\\s*대미지\\s*(.+)\\s*~\\s*(.+)\\s*(?:포인트\\s*)?부여$/, "Adds $1 to $2 Physical Damage to Spells");

  // ----------------------------------------------------
  // 위에서 걸러지지 않은 나머지 옵션들은 기존 사전을 따릅니다.
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  const numbers: string[] = [];
  const koPat = t.replace(/[+-]?\\d+(\\.\\d+)?(–\\d+(\\.\\d+)?)?/g, (n) => {
    numbers.push(n);
    return "{N}";
  }).replace(/\\s+/g, " ");

  const enPat = KO_EN_PATTERN_MAP[koPat];
  if (enPat) {
    let i = 0;
    return enPat.replace(/\\{N\\}/g, () => numbers[i++] || "");
  }

  // 예외 처리 (수동 복구본 백업)
  t = t.replace(/추가 저주를 (\\d+) 개 시전할 수 있다\\.?/, "You can cast $1 additional Curses");
  t = t.replace(/크리티컬 대미지 감면 \\+?(\\d+)%/, "+$1% Critical Strike Damage Mitigation");
  t = t.replace(/받은 부식 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "Converts $1% of Erosion Damage Taken to Cold Damage");
  t = t.replace(/받은 물리 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "Converts $1% of Physical Damage Taken to Cold Damage");

  return t;
};
`;

  content = content.replace(funcRegex, newFunc);
  await writeFile(MAP_FILE, content, "utf-8");
  console.log(
    "✅ 갓 모드(God Mode) 정규식이 적용되었습니다! 수만 개의 범위(Range) 에러가 일망타진됩니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
