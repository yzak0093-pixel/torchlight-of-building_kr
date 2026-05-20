import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let content = await readFile(shapesPath, "utf-8");

  // 1. 잘못 삽입된 찌꺼기 코드 싹 다 청소
  content = content.replace(
    /,\s*Vertical6: { rows: 6, cols: 1 },\s*Pinwheel: { rows: 3, cols: 2 },?/g,
    "",
  );
  content = content.replace(
    /,\s*Vertical6: \[\s*\[0, 0\],\s*\[1, 0\],\s*\[2, 0\],\s*\[3, 0\],\s*\[4, 0\],\s*\[5, 0\],\s*\],\s*Pinwheel: \[\s*\[0, 0\],\s*\[1, 0\],\s*\[1, 1\],\s*\[2, 1\],\s*\]/g,
    "",
  );
  content = content.replace(/return bounds;,/g, "return bounds;");

  // 2. 정확한 위치(export const SHAPE_BOUNDS 선언부 바로 위)에 SHAPE_CELLS 데이터 추가
  content = content.replace(
    /(\s*\];\s*)(export const SHAPE_BOUNDS)/,
    `,
  Vertical6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ],
  Pinwheel: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
};

$2`,
  );

  // 3. 파일의 제일 마지막 부분에 SHAPE_BOUNDS 데이터 안전하게 추가
  content = content.replace(
    /(export const SHAPE_BOUNDS: Record<AnySlateShape, \{ rows: number; cols: number \}> = \{[\s\S]*?)(\};\s*)$/,
    `$1  Vertical6: { rows: 6, cols: 1 },
  Pinwheel: { rows: 3, cols: 2 },
$2`,
  );

  await writeFile(shapesPath, content, "utf-8");
  console.log("🩹 src/lib/divinity-shapes.ts 파일 복구 및 올바른 삽입 완료!");

  // 포맷팅 재시도
  console.log("🎨 코드 포맷팅 재시도 중...");
  try {
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 포맷팅 완벽 통과! 모든 작업이 성공적으로 완료되었습니다!");
  } catch (e) {
    console.error(
      "포맷팅 중 오류가 발생했습니다. 구문을 다시 확인해야 합니다.",
    );
  }
};

main().catch(console.error);
