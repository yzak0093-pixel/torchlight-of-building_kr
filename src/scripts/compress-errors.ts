import { readFile, writeFile } from "node:fs/promises";

const main = async () => {
  console.log("🗜️ 31만 줄의 에러 로그를 분석하여 핵심 패턴만 압축합니다...");

  try {
    const content = await readFile("unsupported-mods.txt", "utf-8");
    const lines = content.split("\n");

    // 패턴을 저장할 맵 (패턴문자열 -> { 발생횟수, 실제예시 })
    const patternMap = new Map<string, { count: number; example: string }>();

    for (const line of lines) {
      if (line.startsWith("[🇰🇷 한국어]")) {
        const rawText = line.replace("[🇰🇷 한국어]", "").trim();

        // 정규식을 이용해 모든 숫자(\d+)를 {N}으로 바꿔서 글자 패턴만 남깁니다.
        const pattern = rawText.replace(/\d+/g, "{N}");

        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 1, example: rawText });
        } else {
          patternMap.get(pattern)!.count++;
        }
      }
    }

    // 발생 횟수(count) 기준으로 내림차순 정렬
    const sorted = [...patternMap.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    );

    let output = "📊 [가장 많이 발생한 핵심 에러 패턴 TOP 50]\n\n";
    output +=
      "※ 아래의 문장들만 해결하면 수만 개의 에러가 동시에 해결됩니다.\n\n";

    for (let i = 0; i < Math.min(50, sorted.length); i++) {
      const [pattern, data] = sorted[i];
      output += `${i + 1}. [${data.count}회 발생] ${data.example}\n`;
    }

    await writeFile("top-errors-summary.txt", output, "utf-8");
    console.log(
      "✅ 압축 완료! 프로젝트 최상단 폴더에 'top-errors-summary.txt' 파일이 생성되었습니다.",
    );
  } catch (e) {
    console.log(
      "❌ 파일을 읽는 중 에러가 발생했습니다. unsupported-mods.txt 파일이 있는지 확인해주세요.",
    );
  }
};

main().catch(console.error);
