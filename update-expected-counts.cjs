/**
 * update-expected-counts.cjs
 *
 * generate-skill-data.ts의 SKILL_TYPES 배열에서 expectedCount를
 * 실제 캐시된 HTML 파일 개수로 자동 업데이트합니다.
 *
 * 사용법: node update-expected-counts.cjs
 */

const fs = require("fs");
const path = require("path");

const SKILL_DATA_FILE = path.join(
  __dirname,
  "src",
  "scripts",
  "generate-skill-data.ts",
);

const SKILL_CACHE_DIR = path.join(__dirname, ".garbage", "tlidb", "skill");

// SKILL_TYPES의 outputDir → 캐시 폴더 매핑
const DIR_MAP = {
  active: "active",
  support: "support",
  passive: "passive",
  activation_medium: "activation_medium",
  noble_support: "noble_support",
  magnificent_support: "magnificent_support",
};

// 실제 캐시 파일 개수 카운트
const getCacheCount = (dir) => {
  const fullPath = path.join(SKILL_CACHE_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  캐시 폴더 없음: ${fullPath}`);
    return null;
  }
  const files = fs.readdirSync(fullPath).filter((f) => f.endsWith(".html"));
  return files.length;
};

// generate-skill-data.ts 읽기
let content = fs.readFileSync(SKILL_DATA_FILE, "utf-8");

let updatedCount = 0;

for (const [outputDir, cacheDir] of Object.entries(DIR_MAP)) {
  const actual = getCacheCount(cacheDir);
  if (actual === null) continue;

  // outputDir 기준으로 해당 SKILL_TYPES 블록 찾아서 expectedCount 교체
  // 패턴: outputDir: "active", ... expectedCount: 151,
  const regex = new RegExp(
    `(outputDir:\\s*"${outputDir}",[\\s\\S]*?expectedCount:\\s*)(\\d+)`,
    "m",
  );

  const match = content.match(regex);
  if (!match) {
    console.warn(`⚠️  '${outputDir}' 패턴을 찾지 못했습니다.`);
    continue;
  }

  const current = parseInt(match[2], 10);
  if (current === actual) {
    console.log(`✅ ${outputDir}: ${actual}개 (변경 없음)`);
    continue;
  }

  content = content.replace(regex, `$1${actual}`);
  console.log(`🔄 ${outputDir}: ${current} → ${actual}`);
  updatedCount++;
}

if (updatedCount > 0) {
  fs.writeFileSync(SKILL_DATA_FILE, content, "utf-8");
  console.log(`\n💾 저장 완료! ${updatedCount}개 항목 업데이트됨`);
} else {
  console.log("\nℹ️  모든 expectedCount가 최신 상태입니다.");
}
