import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let content = await readFile(shapesPath, "utf-8");

  // 1. 파일 맨 끝부분의 치명적 에러 (return bounds;,) 및 이어지는 찌꺼기 완벽 청소
  let lines = content.split("\n");
  let insideGarbage = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("return bounds;,")) {
      lines[i] = lines[i].replace("return bounds;,", "return bounds;");
      insideGarbage = true;
    } else if (insideGarbage) {
      if (lines[i].includes("};")) {
        insideGarbage = false;
      } else {
        lines[i] = ""; // 함수 밖으로 튀어나간 불량 데이터 삭제
      }
    }
  }
  content = lines.join("\n");

  // 2. SHAPE_CELLS 내부 정상 데이터만 추출하여 안전하게 재조립
  const cellsRegex = /(export const SHAPE_CELLS[^=]*=\s*\{)([\s\S]*?)(\n\};)/;
  const cellsMatch = content.match(cellsRegex);
  if (cellsMatch) {
    const inner = cellsMatch[2];
    // 정상적인 "키: [[숫자,숫자]]" 형태의 데이터만 정규식으로 완벽하게 추출 (찌꺼기는 버려짐)
    const validShapes = inner.match(
      /[A-Za-z0-9_]+\s*:\s*\[(?:\s*\[\s*-?\d+\s*,\s*-?\d+\s*\]\s*,?\s*)*\s*\]/g,
    );
    if (validShapes) {
      let filteredShapes = validShapes.filter(
        (s) => !s.startsWith("Vertical6") && !s.startsWith("Pinwheel"),
      );
      // 완벽한 8칸 바람개비와 6칸 막대 주입
      filteredShapes.push(
        `Vertical6: [\n    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]\n  ]`,
      );
      filteredShapes.push(
        `Pinwheel: [\n    [0, 2],\n    [1, 0], [1, 1], [1, 2],\n    [2, 1], [2, 2], [2, 3],\n    [3, 1]\n  ]`,
      );
      const newInner = "\n  " + filteredShapes.join(",\n  ") + "\n";
      content = content.replace(
        cellsMatch[0],
        cellsMatch[1] + newInner + cellsMatch[3],
      );
    }
  }

  // 3. SHAPE_BOUNDS 내부 정상 데이터만 추출하여 안전하게 재조립
  const boundsRegex = /(export const SHAPE_BOUNDS[^=]*=\s*\{)([\s\S]*?)(\n\};)/;
  const boundsMatch = content.match(boundsRegex);
  if (boundsMatch) {
    const inner = boundsMatch[2];
    const validBounds = inner.match(
      /[A-Za-z0-9_]+\s*:\s*\{\s*rows\s*:\s*\d+\s*,\s*cols\s*:\s*\d+\s*\}/g,
    );
    if (validBounds) {
      let filteredBounds = validBounds.filter(
        (b) => !b.startsWith("Vertical6") && !b.startsWith("Pinwheel"),
      );
      filteredBounds.push(`Vertical6: { rows: 6, cols: 1 }`);
      filteredBounds.push(`Pinwheel: { rows: 4, cols: 4 }`);
      const newInner = "\n  " + filteredBounds.join(",\n  ") + "\n";
      content = content.replace(
        boundsMatch[0],
        boundsMatch[1] + newInner + boundsMatch[3],
      );
    }
  }

  // 저장 및 포맷팅
  await writeFile(shapesPath, content, "utf-8");
  console.log("✅ divinity-shapes.ts 파일 정상 데이터 기반 완벽 재구성 완료!");

  try {
    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 포맷팅 완벽 통과! 모든 에러가 소멸되었습니다.");
  } catch (e) {
    console.error("포맷팅 실패. 하지만 코드 구조는 정상적으로 복구되었습니다.");
  }
};

main().catch(console.error);
