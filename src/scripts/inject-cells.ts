import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let content = await readFile(shapesPath, "utf-8");

  if (!content.includes("Vertical6: [")) {
    // SHAPE_CELLS 객체가 끝나는 닫는 중괄호를 찾아 그 안에 안전하게 삽입합니다.
    content = content.replace(
      /\s*\};\s*(export const SHAPE_BOUNDS)/,
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
  ]
};

$1`,
    );
    await writeFile(shapesPath, content, "utf-8");
    console.log("✅ SHAPE_CELLS 좌표 데이터 완벽하게 삽입 완료!");

    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
  } else {
    console.log("⏭️ 이미 좌표 데이터가 존재합니다.");
  }
};
main().catch(console.error);
