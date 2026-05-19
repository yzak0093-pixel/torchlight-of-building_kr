/**
 * debug.cjs
 * 목적: CLI 환경에 구애받지 않고 무조건 HTML 페이지를 새로 다운로드하도록 강제 고정합니다.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(
  __dirname,
  "src",
  "scripts",
  "generate-legendary-data.ts",
);
if (!fs.existsSync(FILE)) {
  console.error(`❌ 파일을 찾을 수 없습니다: ${FILE}`);
  process.exit(1);
}

let content = fs.readFileSync(FILE, "utf-8");

// main 함수 진입 시 무조건 options.refetch를 true로 강제 설정
const targetString =
  "const main = async (options: Options): Promise<void> => {";
if (
  content.includes(targetString) &&
  !content.includes("options.refetch = true; // 무조건 강제 다운로드")
) {
  content = content.replace(
    targetString,
    `${targetString}\n  options.refetch = true; // 무조건 강제 다운로드 패치`,
  );
  fs.writeFileSync(FILE, content, "utf-8");
  console.log("✅ 다운로드 강제(Refetch = true) 고정 패치 완료!");
} else {
  console.log("ℹ️ 이미 패치가 적용되었거나 패턴을 찾을 수 없습니다.");
}
