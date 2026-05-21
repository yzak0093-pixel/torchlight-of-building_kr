import { KO_EN_AFFIX_MAP } from "../tli/mod-parser/ko-en-affix-map";
import { parseMod } from "../tli/mod-parser/index";
import { translateAffixToEn } from "../tli/mod-parser/ko-en-affix-map";

let success = 0;
let fail = 0;
const lines: string[] = [];

for (const [ko, en] of Object.entries(KO_EN_AFFIX_MAP)) {
  const translated = translateAffixToEn(ko);
  const parsed = parseMod(translated);
  if (parsed && parsed.length > 0) {
    success++;
  } else {
    fail++;
    lines.push(`KO: ${ko}`);
    lines.push(`EN: ${translated}`);
    lines.push("");
  }
}

lines.push(`성공: ${success}개 / 실패: ${fail}개`);

import { writeFileSync } from "node:fs";
writeFileSync("affix-fail-report.txt", lines.join("\n"), "utf-8");
console.log(`✅ 성공: ${success}개 / ❌ 실패: ${fail}개`);
console.log("📄 affix-fail-report.txt 저장 완료");
