import { parseMod } from "../tli/mod-parser/index";
import { translateAffixToEn } from "../tli/mod-parser/ko-en-affix-map";

const testStrings = [
  "해당 장비 보호막 +170",
  "화염 저항 +8%",
  "지혜 +18",
  "최대 보호막 추가 +10%",
  "크리티컬 대미지 감면 +37%",
];

console.log("=== 🔍 파서 파이프라인 정밀 진단 ===");
for (const str of testStrings) {
  console.log(`\n🔴 [원본 한글]: ${str}`);
  const translated = translateAffixToEn(str);
  console.log(`🟡 [영어 번역]: ${translated}`);

  const parsed = parseMod(str);
  if (parsed) {
    console.log(`🟢 [파서 인식]: 매칭 성공!`);
    console.log(parsed);
  } else {
    console.log(`❌ [파서 인식]: 매칭 실패 (Mod not supported)`);
  }
}
