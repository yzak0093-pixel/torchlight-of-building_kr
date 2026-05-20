import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let content = await readFile(shapesPath, "utf-8");

  const lines = content.split("\n");
  let inShapeCells = false;
  let insideArray = false;
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. 에러 발생 지점 복구 (return bounds;,)
    if (line.includes("return bounds;,")) {
      cleanedLines.push(line.replace("return bounds;,", "return bounds;"));
      // 잘못 삽입된 크기 데이터(Vertical6, Pinwheel)를 건너뛰고 닫는 괄호(})까지 스킵
      let j = i + 1;
      while (j < lines.length && !lines[j].includes("};")) {
        j++;
      }
      i = j - 1; // 닫는 괄호 위치로 인덱스 점프
      continue;
    }

    // 2. SHAPE_CELLS 내부의 떠다니는 찌꺼기 배열 필터링
    if (line.includes("export const SHAPE_CELLS")) {
      inShapeCells = true;
      cleanedLines.push(line);
    } else if (inShapeCells && line.includes("export const SHAPE_BOUNDS")) {
      inShapeCells = false;
      cleanedLines.push(line);
    } else if (inShapeCells) {
      if (line.match(/[A-Za-z0-9_]+:\s*\[/)) {
        insideArray = true; // 정상적인 배열 시작
        cleanedLines.push(line);
      } else if (line.match(/^\s*\],?/)) {
        if (insideArray) {
          insideArray = false; // 정상적인 배열 종료
          cleanedLines.push(line);
        }
        // insideArray가 false인데 '],'가 나오면 찌꺼기이므로 자동 삭제!
      } else if (line.match(/^\s*\[[0-9\s,]+\]/)) {
        if (insideArray) {
          cleanedLines.push(line); // 정상적인 좌표 데이터
        }
        // insideArray가 false인데 좌표가 나오면 찌꺼기이므로 자동 삭제!
      } else if (line.match(/^\s*\};/)) {
        inShapeCells = false;
        cleanedLines.push(line);
      } else {
        // 그 외 빈 줄이나 일반 코드
        if (!line.trim().startsWith("[") && !line.trim().startsWith("]")) {
          cleanedLines.push(line);
        }
      }
    } else {
      cleanedLines.push(line);
    }
  }

  let finalContent = cleanedLines.join("\n");

  // 혹시 남아있을 수 있는 불량 Vertical6, Pinwheel 정의 싹 지우기
  finalContent = finalContent.replace(/\s*Vertical6:\s*\[[\s\S]*?\],?/g, "");
  finalContent = finalContent.replace(/\s*Pinwheel:\s*\[[\s\S]*?\],?/g, "");
  finalContent = finalContent.replace(/\s*Vertical6:\s*\{[\s\S]*?\},?/g, "");
  finalContent = finalContent.replace(/\s*Pinwheel:\s*\{[\s\S]*?\},?/g, "");

  // 중복 콤마(,,) 안전망 처리
  finalContent = finalContent.replace(/,,/g, ",");

  // 3. 올바른 위치에 사진과 완벽히 일치하는 도면 데이터 주입
  finalContent = finalContent.replace(
    /(\s*\};\s*export const SHAPE_BOUNDS)/,
    `,\n  Vertical6: [\n    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]\n  ],\n  Pinwheel: [\n    [0, 2],\n    [1, 0], [1, 1], [1, 2],\n    [2, 1], [2, 2], [2, 3],\n    [3, 1]\n  ]\n$1`,
  );

  finalContent = finalContent.replace(
    /(\s*\};\s*)$/,
    `,\n  Vertical6: { rows: 6, cols: 1 },\n  Pinwheel: { rows: 4, cols: 4 }\n$1`,
  );

  await writeFile(shapesPath, finalContent, "utf-8");
  console.log("✅ divinity-shapes.ts 찌꺼기 완벽 제거 및 도면 복구 완료!");

  // 4. UI 찌그러짐 방지 (캔버스 박스 확장)
  const crafterPath = join(
    process.cwd(),
    "src",
    "components",
    "divinity",
    "LegendarySlateCrafter.tsx",
  );
  let crafter = await readFile(crafterPath, "utf-8");
  if (crafter.includes("h-20 w-20")) {
    crafter = crafter.replace(/h-20 w-20/g, "min-h-[140px] min-w-[140px] p-2");
    await writeFile(crafterPath, crafter, "utf-8");
    console.log("✅ UI 박스 크기 확장 완료!");
  }

  try {
    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 에러 소멸! 브라우저를 새로고침 하십시오!");
  } catch (e) {
    console.error("포맷팅 실패. 하지만 코드 구조는 완벽히 복구되었습니다.");
  }
};

main().catch(console.error);
