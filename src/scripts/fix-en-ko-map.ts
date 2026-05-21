import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const generatorPath = join(
    process.cwd(),
    "src",
    "scripts",
    "generate-gear-affix-data.ts",
  );
  let content = await readFile(generatorPath, "utf-8");

  // 선생님께서 정리해주신 정확한 매핑 데이터
  const correctMap = `{
      // Accessories
      Belt: "벨트",
      Ring: "반지",
      Necklace: "목걸이",
      SpiritRing: "영혼반지",
      // STR Armor
      STRChestArmor: "힘흉갑",
      STRHelmet: "힘투구",
      STRGloves: "힘글러브",
      STRBoots: "힘신발",
      STRShield: "힘방패",
      // DEX Armor
      DEXChestArmor: "민첩흉갑",
      DEXHelmet: "민첩투구",
      DEXGloves: "민첩장갑",
      DEXBoots: "민첩신발",
      DEXShield: "민첩방패",
      // INT Armor
      INTChestArmor: "지혜흉갑",
      INTHelmet: "지혜투구", // (HTML 기준 지혜투구)
      INTGloves: "지혜장갑",
      INTBoots: "지혜신발",
      INTShield: "지혜방패",
      // One-Handed Weapons
      Scepter: "한손지팡이",
      Wand: "마력지팡이",
      Cane: "마법지팡이",
      Rod: "영혼지팡이",
      Cudgel: "무사의스틱",
      Dagger: "단검",
      Claw: "클로",
      "One-HandedAxe": "한손도끼",
      "One-HandedSword": "한손검",
      "One-HandedHammer": "한손해머",
      Pistol: "권총",
      // Two-Handed Weapons
      TinStaff: "주석지팡이",
      Bow: "활",
      Crossbow: "석궁",
      Musket: "머스킷",
      FireCannon: "화포",
      "Two-HandedAxe": "양손도끼",
      "Two-HandedSword": "양손검",
      "Two-HandedHammer": "양손해머",
    }`;

  // 1. parseSimpleAffixTable 내부의 enKoMap 교체
  const enKoMapRegex = /const enKoMap: Record<string, string> = \{[\s\S]*?\};/;
  if (enKoMapRegex.test(content)) {
    content = content.replace(
      enKoMapRegex,
      `const enKoMap: Record<string, string> = ${correctMap};`,
    );
  }

  // 2. parseCraftAffixes 내부의 koMap 교체
  const koMapRegex = /const koMap: Record<string, string> = \{[\s\S]*?\};/;
  if (koMapRegex.test(content)) {
    content = content.replace(
      koMapRegex,
      `const koMap: Record<string, string> = ${correctMap};`,
    );
  }

  await writeFile(generatorPath, content, "utf-8");
  console.log(
    "✅ generate-gear-affix-data.ts의 한영 매핑(enKoMap, koMap)이 선생님의 표에 맞춰 완벽하게 수정되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "inherit" });
  } catch (e) {}
};

main().catch(console.error);
