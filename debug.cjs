/**
 * debug.cjs
 * 목적: options.refetch 조건문을 강제로 true로 만들어 무조건 페이지를 다운로드하도록 패치
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

// 옵션 조건문(if (options.refetch))을 무조건 실행(if (true))되도록 강제 변경
if (content.includes("if (options.refetch)")) {
  content = content.replace(
    /if\s*\(\s*options\.refetch\s*\)/g,
    "if (true /* forced download */)",
  );
  fs.writeFileSync(FILE, content, "utf-8");
  console.log("✅ 다운로드 무조건 강제(if true) 패치 완료!");
} else {
  console.log("ℹ️ 이미 패치되었거나 해당 구문을 찾을 수 없습니다.");
}
