import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "builder",
  "StatsPanel.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 1. hasMaxRes 조건 무조건 true로 강제 (줄바꿈 대응)
  content = content.replace(
    /const\s+hasMaxRes\s*=\s*[^;]+;/,
    "const hasMaxRes = true;",
  );

  // 2. {cMax !== 60 && ...} 조건식 껍데기 완전 제거 (다중 줄바꿈 대응)
  content = content.replace(
    /\{cMax\s*!==\s*60\s*&&\s*\(\s*(<StatLine[^>]+>)\s*\)\s*\}/g,
    "$1",
  );
  content = content.replace(
    /\{cMax\s*!==\s*60\s*&&\s*(<StatLine[^>]+>)\s*\}/g,
    "$1",
  );

  content = content.replace(
    /\{lMax\s*!==\s*60\s*&&\s*\(\s*(<StatLine[^>]+>)\s*\)\s*\}/g,
    "$1",
  );
  content = content.replace(
    /\{lMax\s*!==\s*60\s*&&\s*(<StatLine[^>]+>)\s*\}/g,
    "$1",
  );

  content = content.replace(
    /\{fMax\s*!==\s*60\s*&&\s*\(\s*(<StatLine[^>]+>)\s*\)\s*\}/g,
    "$1",
  );
  content = content.replace(
    /\{fMax\s*!==\s*60\s*&&\s*(<StatLine[^>]+>)\s*\}/g,
    "$1",
  );

  content = content.replace(
    /\{eMax\s*!==\s*60\s*&&\s*\(\s*(<StatLine[^>]+>)\s*\)\s*\}/g,
    "$1",
  );
  content = content.replace(
    /\{eMax\s*!==\s*60\s*&&\s*(<StatLine[^>]+>)\s*\}/g,
    "$1",
  );

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [모달창 2차 패치 완료] 코드 포맷팅을 무시하고 저항 한도를 무조건 표시하도록 강제 적용했습니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
