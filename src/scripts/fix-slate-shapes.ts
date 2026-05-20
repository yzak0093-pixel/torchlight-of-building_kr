import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  // 1. divinity-shapes.ts 완벽 교체 (8칸 바람개비 적용)
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let shapes = await readFile(shapesPath, "utf-8");

  // 혹시 꼬여있을지 모르는 기존 모양 데이터 싹 정리
  shapes = shapes.replace(/(,\s*)?Vertical6:\s*\[[\s\S]*?\]/g, "");
  shapes = shapes.replace(/(,\s*)?Pinwheel:\s*\[[\s\S]*?\]/g, "");
  shapes = shapes.replace(/(,\s*)?Vertical6:\s*\{[^}]+\}/g, "");
  shapes = shapes.replace(/(,\s*)?Pinwheel:\s*\{[^}]+\}/g, "");

  // 사진과 완벽히 일치하는 8칸 바람개비(Pinwheel)와 6칸 막대(Vertical6) 주입
  shapes = shapes.replace(
    /(\s*)(\};\s*export const SHAPE_BOUNDS)/,
    `,\n  Vertical6: [\n    [0, 0],\n    [1, 0],\n    [2, 0],\n    [3, 0],\n    [4, 0],\n    [5, 0]\n  ],\n  Pinwheel: [\n    [0, 2],\n    [1, 0], [1, 1], [1, 2],\n    [2, 1], [2, 2], [2, 3],\n    [3, 1]\n  ]$1$2`,
  );

  // 크기(Bounds) 데이터 업데이트
  shapes = shapes.replace(
    /(\s*)(\};\s*)$/,
    `,\n  Vertical6: { rows: 6, cols: 1 },\n  Pinwheel: { rows: 4, cols: 4 }$1$2`,
  );

  await writeFile(shapesPath, shapes, "utf-8");
  console.log(
    "✅ divinity-shapes.ts 도면 데이터 완벽 수정 완료 (8칸 바람개비 적용)!",
  );

  // 2. UI 잘림 방지 (LegendarySlateCrafter.tsx 캔버스 크기 확장)
  const crafterPath = join(
    process.cwd(),
    "src",
    "components",
    "divinity",
    "LegendarySlateCrafter.tsx",
  );
  let crafter = await readFile(crafterPath, "utf-8");

  if (crafter.includes("h-20 w-20")) {
    // 80px(h-20) 고정을 넉넉한 140px 가변 박스로 변경
    crafter = crafter.replace(/h-20 w-20/g, "min-h-[140px] min-w-[140px] p-2");
    await writeFile(crafterPath, crafter, "utf-8");
    console.log("✅ LegendarySlateCrafter.tsx 미리보기 박스 크기 확장 완료!");
  }

  console.log("🎨 포맷팅 적용 중...");
  execSync("pnpm format", { stdio: "inherit" });
  console.log("🎉 모든 수정이 성공적으로 끝났습니다!");
};

main().catch(console.error);
