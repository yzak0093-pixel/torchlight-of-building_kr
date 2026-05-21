import { parseMod } from "../tli/mod-parser/index";

// 파서 엔진이 좋아할 만한 모든 영어 문법 후보군
const testPhrases = [
  // HP 후보
  "+286 Max Life",
  "+286 max life",
  "+286 to Max Life",
  "+286 to maximum Life",
  "+286 Maximum Life",

  // MP 후보
  "+73 Max Mana",
  "+73 max mana",
  "+73 to Max Mana",
  "+73 to maximum Mana",

  // 장비 보호막 후보
  "+241 Gear Energy Shield",
  "+241 gear energy shield",
  "+241 to Gear Energy Shield",
  "+241 Energy Shield",
  "+241 energy shield",
  "+241 to maximum Energy Shield",
];

console.log("🎯 파서 엔진이 인정하는 '진짜 영어 문법' 스나이퍼 테스트 시작\n");

for (const phrase of testPhrases) {
  const parsed = parseMod(phrase);
  if (parsed) {
    console.log(`✅ 성공! 파서가 인정하는 문법: "${phrase}"`);
  } else {
    console.log(`❌ 실패: "${phrase}"`);
  }
}
