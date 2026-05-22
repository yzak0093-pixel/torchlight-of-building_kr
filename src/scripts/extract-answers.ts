import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const main = async () => {
  const templatePath = join(
    process.cwd(),
    "src",
    "tli",
    "mod-parser",
    "templates.ts",
  );
  let content = "";
  try {
    content = await readFile(templatePath, "utf-8");
  } catch (e) {
    console.log("❌ templates.ts 파일을 찾을 수 없습니다.");
    return;
  }

  const lines = content.split("\n");

  // 에러난 한국어 옵션들에 대응하는 영어 핵심 키워드
  const keywords = [
    "hasten",
    "wilt",
    "channeling",
    "chest armor",
    "elixir",
    "bombardment",
    "true damage",
    "ailment duration",
  ];

  let output = "🎯 [TOB 엔진 템플릿 정답지]\n\n";
  let matchCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 주석이나 너무 짧은 줄은 제외하고 영문자 템플릿만 추출
    if (line.includes('"') && line.length > 10) {
      const lower = line.toLowerCase();
      const matchedKw = keywords.find((kw) => lower.includes(kw));

      if (matchedKw) {
        output += `[키워드: ${matchedKw}] ${line}\n`;
        matchCount++;
      }
    }
  }

  await writeFile("tob-answers.txt", output, "utf-8");
  console.log(`✅ 탐색 완료! ${matchCount}개의 관련 엔진 템플릿을 찾았습니다.`);
  console.log("프로젝트 최상단 폴더의 'tob-answers.txt' 파일을 확인해주세요!");
};

main().catch(console.error);
