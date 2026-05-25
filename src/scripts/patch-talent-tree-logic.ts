import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(process.cwd(), "src", "tli", "talent-tree.ts");

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 1. 함수 시그니처 변경 (y 좌표를 받아오도록 수정)
  const search1 =
    /export const canPlaceInverseImage = \(\n\s*x: number,\n\s*treeSlot: string,/;
  const replace1 = `export const canPlaceInverseImage = (
  x: number,
  y: number, // 🚀 Y 좌표 검증 추가
  treeSlot: string,`;
  content = content.replace(search1, replace1);

  // 2. 하드코딩된 데드존 룰 교체
  const search2 =
    /\/\/ Not in the 3 center-most columns \(columns 2, 3, 4\)\n\s*if \(x >= 2 && x <= 4\) \{\n\s*return \{\n\s*canPlace: false,\n\s*reason: "Inverse images cannot be placed in the center columns \(2, 3, 4\)",\n\s*\};\n\s*\}/;
  const replace2 = `// 🚫 데드존 검증: 6, 9, 12pts 중앙 3줄 (x: 2~4, y: 1~3)
  if (x >= 2 && x <= 4 && y >= 1 && y <= 3) {
    return {
      canPlace: false,
      reason: "Inverse images cannot be placed in the center dead zone.",
    };
  }`;
  content = content.replace(search2, replace2);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [엔진 비즈니스 로직 패치 1/2 완료] canPlaceInverseImage 함수가 y좌표 데드존을 정확히 판별하도록 수정되었습니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
