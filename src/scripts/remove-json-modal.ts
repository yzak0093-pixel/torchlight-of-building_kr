import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const filePath = join(
    process.cwd(),
    "src",
    "components",
    "builder",
    "StatsPanel.tsx",
  );
  let content = await readFile(filePath, "utf-8");

  // 지워야 할 부분의 시작과 끝을 찾습니다.
  const startText = "{/* 디버깅용 원본 데이터 (기본적으로 접혀있음) */}";
  const endText = "</details>";

  const startIndex = content.indexOf(startText);
  const endIndex = content.indexOf(endText, startIndex);

  if (startIndex !== -1 && endIndex !== -1) {
    // 해당 블록을 완전히 삭제합니다.
    content =
      content.slice(0, startIndex) + content.slice(endIndex + endText.length);

    await writeFile(filePath, content, "utf-8");
    console.log(
      "✅ 불필요한 JSON 데이터 표시 부분이 깔끔하게 완전히 제거되었습니다!",
    );
  } else {
    console.log("⚡ 이미 제거되었거나 해당 부분을 찾을 수 없습니다.");
  }

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
