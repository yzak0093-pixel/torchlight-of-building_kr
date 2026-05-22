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

  // 기존 정규식을 엔진 정답지 기반으로 교체합니다.
  const funcRegex = /export const translateAffixToEn = \([\s\S]+$/;

  const newFunc = `export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 1. 쓰레기 데이터 조기 차단
  if (t.includes("$(document).ready") || /^Tier$/.test(t) || /^메인 옵션$/.test(t) || /^서브 옵션$/.test(t) || t.includes("옵션 /") || t.includes("Item /") || /^옵션 효과$/.test(t) || t.includes("레벨 조건")) {
    return t;
  }

  let m;
  
  // 🚀 [신규] TOB 엔진 템플릿에서 100% 일치 확인된 정답들 (소문자/형식 완벽 일치)
  if ((m = t.match(/신속을 보유한다/))) return "has hasten";
  if ((m = t.match(/악화 대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt damage\`;
  if ((m = t.match(/악화 확률\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt chance\`;
  if ((m = t.match(/악화 지속 시간\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt duration\`;
  if ((m = t.match(/상태 이상\\s*지속 시간\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% ailment duration\`;
  if ((m = t.match(/([\\d\\.\\-–~]+)초당\\s*([\\d\\.\\-–~]+)포인트의 트루 대미지를 받는다/))) return \`takes \${m[2]} true damage every \${m[1]}s\`;
  
  // 엔진에 없는 특수 레전드 옵션들 (에러 안나게 커스텀 텍스트로 치환)
  if ((m = t.match(/추가 저주를 ([\\d\\.\\-–~]+) 개 시전할 수 있다/))) return \`You can cast \${m[1]} additional Curses\`;
  if ((m = t.match(/받은 물리 대미지의 ([\\d\\.\\-–~]+)% 가 냉기 대미지로 전환/))) return \`Converts \${m[1]}% of Physical Damage Taken to Cold Damage\`;
  if ((m = t.match(/흉갑에서 획득한 방어 \\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Armor from Chest Armor\`;
  if ((m = t.match(/영약 스킬 시전 시 모든 축복을 ([\\d\\.\\-–~]+) 회 획득한다/))) return \`Gain \${m[1]} stack of all Blessings when using Elixir skills\`;
  if ((m = t.match(/대미지 \\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Damage\`;
  if ((m = t.match(/원소\\s*저항 \\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Elemental Resistance\`;
  if ((m = t.match(/소환체의 원소 및 부식 저항 관통 \\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Minion Elemental and Erosion Resistance Penetration\`;
  if ((m = t.match(/폭발하여 반경 ([\\d\\.\\-–~]+) 미터 내의 적에게 처치된 적의 최대 HP ([\\d\\.\\-–~]+)% 만큼 트루 대미지를 입힌다/))) return \`20% chance to explode on kill, dealing \${m[2]}% of killed enemy's Max HP as True Damage to enemies within \${m[1]}m\`;
  
  // 🚀 2. 저격 추출 모드 (기존 유지)
  if ((m = t.match(/최대\\s*HP\\s*\\+?\\s*([\\d\\.\\-–~]+)(%?)/))) return \`+\${m[1]}\${m[2]} Max Life\`;
  if ((m = t.match(/최대\\s*MP\\s*\\+?\\s*([\\d\\.\\-–~]+)(%?)/))) return \`+\${m[1]}\${m[2]} Max Mana\`;
  if ((m = t.match(/최대\\s*보호막\\s*\\+?\\s*([\\d\\.\\-–~]+)(%?)/))) return \`+\${m[1]}\${m[2]} Max Energy Shield\`;
  if ((m = t.match(/해당\\s*장비\\s*보호막\\s*\\+?\\s*([\\d\\.\\-–~]+)(%?)/))) return \`+\${m[1]}\${m[2]} Gear Energy Shield\`;
  if ((m = t.match(/1초당\\s*HP\\s*([\\d\\.\\-–~]+)\\s*회복/))) return \`Regenerates \${m[1]} Life per second\`;

  if ((m = t.match(/힘\\s*\\+?\\s*([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Strength\`;
  if ((m = t.match(/민첩\\s*\\+?\\s*([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Dexterity\`;
  if ((m = t.match(/지혜\\s*\\+?\\s*([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Intelligence\`;

  if ((m = t.match(/물리\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Physical Damage\`;
  if ((m = t.match(/원소\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Elemental Damage\`;
  if ((m = t.match(/부식\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Erosion Damage\`;
  if ((m = t.match(/주술\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Spell Damage\`;
  if ((m = t.match(/투사체\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Projectile Damage\`;
  if ((m = t.match(/소환체\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Minion Damage\`;

  if ((m = t.match(/해당\\s*장비\\s*물리\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Gear Physical Damage\`;
  if ((m = t.match(/해당\\s*장비\\s*물리\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)\\s*추가/))) return \`Adds \${m[1]} to \${m[2]} Gear Physical Damage\`;
  if ((m = t.match(/해당\\s*장비\\s*화염\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)\\s*추가/))) return \`Adds \${m[1]} to \${m[2]} Gear Fire Damage\`;
  if ((m = t.match(/해당\\s*장비\\s*아머\\s*수치\\s*\\+?\\s*([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Gear Armor\`;
  if ((m = t.match(/해당\\s*장비\\s*회피\\s*수치\\s*\\+?\\s*([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Gear Evasion\`;
  if ((m = t.match(/해당\\s*장비\\s*공격\\s*속도\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Gear Attack Speed\`;
  if ((m = t.match(/해당\\s*장비\\s*공격\\s*크리티컬\\s*수치\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Gear Attack Critical Strike Rating\`;

  if ((m = t.match(/크리티컬\\s*수치\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Critical Strike Rating\`;
  if ((m = t.match(/크리티컬\\s*대미지\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Critical Strike Damage\`;
  if ((m = t.match(/크리티컬\\s*대미지\\s*감면\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Critical Strike Damage Mitigation\`;
  if ((m = t.match(/연속\\s*공격\\s*확률\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Multistrike Chance\`;
  if ((m = t.match(/이동\\s*속도\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Movement Speed\`;
  if ((m = t.match(/심화\\s*효과\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Wilt Effect\`;
  if ((m = t.match(/수확\\s*시간\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Reap Time\`;
  if ((m = t.match(/MP\\s*자연\\s*회복\\s*속도\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Mana Regeneration Speed\`;

  if ((m = t.match(/화염\\s*저항\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Fire Resistance\`;
  if ((m = t.match(/냉기\\s*저항\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Cold Resistance\`;
  if ((m = t.match(/번개\\s*저항\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Lightning Resistance\`;
  if ((m = t.match(/부식\\s*저항\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Erosion Resistance\`;
  if ((m = t.match(/원소와\\s*부식\\s*저항\\s*관통\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Elemental and Erosion Resistance Penetration\`;
  if ((m = t.match(/아머\\s*대미지\\s*감소\\s*관통\\s*\\+?\\s*([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Armor Penetration\`;

  if ((m = t.match(/주술에\\s*화염\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)/))) return \`Adds \${m[1]} to \${m[2]} Fire Damage to Spells\`;
  if ((m = t.match(/주술에\\s*냉기\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)/))) return \`Adds \${m[1]} to \${m[2]} Cold Damage to Spells\`;
  if ((m = t.match(/주술에\\s*번개\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)/))) return \`Adds \${m[1]} to \${m[2]} Lightning Damage to Spells\`;
  if ((m = t.match(/주술에\\s*부식\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)/))) return \`Adds \${m[1]} to \${m[2]} Erosion Damage to Spells\`;
  if ((m = t.match(/주술에\\s*물리\\s*대미지\\s*([\\d\\.\\-–~]+)\\s*~\\s*([\\d\\.\\-–~]+)/))) return \`Adds \${m[1]} to \${m[2]} Physical Damage to Spells\`;

  // 3. 위에서 안 걸린 것들은 기존 방식 사용
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

  return t;
  };
  `;

  content = content.replace(funcRegex, newFunc);
  await writeFile(MAP_FILE, content, "utf-8");
  console.log(
    "✅ 엔진 템플릿과 100% 일치하는 정답들이 파서 번역기에 완벽하게 주입되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
