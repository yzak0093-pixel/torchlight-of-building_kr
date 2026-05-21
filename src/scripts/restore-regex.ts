import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAP_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

const main = async () => {
  let content = await readFile(MAP_FILE, "utf-8");

  // 이미 추가되어 있는지 확인
  if (!content.includes("+$1 max life")) {
    const regexesToInject = `
  // --- 복구된 필수 예외 정규식 (HP, 저주, 크리티컬 등) ---
  t = t.replace(/최대 HP \\+?(\\d+)%/, "+$1% max life");
  t = t.replace(/최대 HP \\+?(\\d+)/, "+$1 max life");
  t = t.replace(/최대 MP \\+?(\\d+)%/, "+$1% max mana");
  t = t.replace(/최대 MP \\+?(\\d+)/, "+$1 max mana");
  t = t.replace(/최대 보호막 \\+?(\\d+)/, "+$1 max energy shield");
  
  t = t.replace(/지혜 \\+?(\\d+)%/, "+$1% intelligence");
  t = t.replace(/지혜 \\+?(\\d+)/, "+$1 intelligence");
  t = t.replace(/지능 \\+?(\\d+)%/, "+$1% intelligence");
  t = t.replace(/지능 \\+?(\\d+)/, "+$1 intelligence");
  t = t.replace(/민첩 \\+?(\\d+)%/, "+$1% dexterity");
  t = t.replace(/민첩 \\+?(\\d+)/, "+$1 dexterity");
  t = t.replace(/힘 \\+?(\\d+)%/, "+$1% strength");
  t = t.replace(/힘 \\+?(\\d+)/, "+$1 strength");
  
  t = t.replace(/해당 장비 보호막 \\+?(\\d+)%/, "+$1% gear energy shield");
  t = t.replace(/해당 장비 보호막 \\+?(\\d+)/, "+$1 gear energy shield");
  t = t.replace(/해당 장비 회피 수치 \\+?(\\d+)%/, "+$1% gear evasion");
  t = t.replace(/해당 장비 회피 수치 \\+?(\\d+)/, "+$1 gear evasion");
  t = t.replace(/해당 장비 방어도 \\+?(\\d+)%/, "+$1% gear armor");
  t = t.replace(/해당 장비 방어도 \\+?(\\d+)/, "+$1 gear armor");
  
  t = t.replace(/냉기 저항 \\+?(\\d+)%?/, "+$1% cold resistance");
  t = t.replace(/화염 저항 \\+?(\\d+)%?/, "+$1% fire resistance");
  t = t.replace(/번개 저항 \\+?(\\d+)%?/, "+$1% lightning resistance");
  t = t.replace(/부식 저항 \\+?(\\d+)%?/, "+$1% erosion resistance");
  t = t.replace(/원소\\s*저항 \\+?(\\d+)%?/, "+$1% elemental resistance");
  
  t = t.replace(/크리티컬 대미지 감면 \\+?(\\d+)%?/, "+$1% critical strike damage mitigation");
  t = t.replace(/크리티컬 수치 \\+?(\\d+)%?/, "+$1% critical strike rating");
  t = t.replace(/공격 및 주술 크리티컬 수치 \\+?(\\d+)/, "+$1 attack and spell critical strike rating");
  t = t.replace(/공격 속도 ([+-]?\\d+(?:\\.\\d+)?)%?/, "$1% attack speed");
  
  t = t.replace(/추가 저주를 (\\d+)\\s*개 시전할 수 있다\\./, "you can cast $1 additional curse(s)");

  return t;`;

    // 마지막 return t; 위치에 정규식 뭉치를 끼워넣습니다.
    content = content.replace("return t;", regexesToInject);
    await writeFile(MAP_FILE, content, "utf-8");
    console.log("✅ 누락되었던 필수 스탯 정규식들이 완벽하게 복구되었습니다!");
  } else {
    console.log("⚡ 이미 정규식이 복구되어 있습니다.");
  }
};

main().catch(console.error);
