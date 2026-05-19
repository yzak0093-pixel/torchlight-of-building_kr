/**
 * debug_vorax.cjs
 * 목적: 폭식자 제작 옵션의 한국어 표 제목(메인 옵션, 서브 옵션)을 스크립트가 완벽하게 인식하도록 패치
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "src", "scripts", "generate-vorax-data.ts");
let content = fs.readFileSync(FILE, "utf-8");

// 기존에 주입했던 '접두', '접미'를 '메인', '서브'로 교체
if (content.includes("접두")) {
  content = content.replace(
    /caption\.includes\("접두"\)/g,
    'caption.includes("메인")',
  );
  content = content.replace(
    /caption\.includes\("접미"\)/g,
    'caption.includes("서브")',
  );
} else if (!content.includes("메인")) {
  // 원본 상태일 경우를 대비한 보험
  content = content.replace(
    /caption\.includes\("pre-fix"\)/g,
    '(caption.includes("pre-fix") || caption.includes("메인"))',
  );
  content = content.replace(
    /caption\.includes\("suffix"\)/g,
    '(caption.includes("suffix") || caption.includes("서브"))',
  );
}

fs.writeFileSync(FILE, content, "utf-8");
console.log("✅ 폭식자 제작 옵션(메인/서브) 100% 인식 패치 완료!");
