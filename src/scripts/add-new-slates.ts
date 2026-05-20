import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  // 1. core.ts 수정 (모양 타입 추가)
  const corePath = join(process.cwd(), "src", "tli", "core.ts");
  let core = await readFile(corePath, "utf-8");
  if (!core.includes('"Vertical6"')) {
    core = core.replace(
      /"Pedigree",\s*\] as const;/,
      `"Pedigree",\n  "Vertical6",\n  "Pinwheel",\n] as const;`,
    );
    await writeFile(corePath, core, "utf-8");
    console.log("✅ src/tli/core.ts 업데이트 완료");
  } else {
    console.log("⏭️ core.ts는 이미 업데이트되어 있습니다.");
  }

  // 2. divinity-shapes.ts 수정 (셀 좌표 및 크기 추가)
  const shapesPath = join(process.cwd(), "src", "lib", "divinity-shapes.ts");
  let shapes = await readFile(shapesPath, "utf-8");

  if (!shapes.includes("Vertical6: [")) {
    // SHAPE_CELLS 마지막에 추가
    shapes = shapes.replace(
      /\s*\};\s*export const SHAPE_BOUNDS/,
      `,\n  Vertical6: [\n    [0, 0],\n    [1, 0],\n    [2, 0],\n    [3, 0],\n    [4, 0],\n    [5, 0],\n  ],\n  Pinwheel: [\n    [0, 0],\n    [1, 0],\n    [1, 1],\n    [2, 1],\n  ],\n};\n\nexport const SHAPE_BOUNDS`,
    );
    // SHAPE_BOUNDS 마지막(파일 끝부분)에 추가
    shapes = shapes.replace(
      /\s*\}(?=[^}]*$)/,
      `,\n  Vertical6: { rows: 6, cols: 1 },\n  Pinwheel: { rows: 3, cols: 2 },\n}`,
    );
    await writeFile(shapesPath, shapes, "utf-8");
    console.log("✅ src/lib/divinity-shapes.ts 업데이트 완료");
  } else {
    console.log("⏭️ divinity-shapes.ts는 이미 업데이트되어 있습니다.");
  }

  // 3. legendary-slate-templates.ts 수정 (템플릿 데이터 추가)
  const templatesPath = join(
    process.cwd(),
    "src",
    "lib",
    "legendary-slate-templates.ts",
  );
  let templates = await readFile(templatesPath, "utf-8");

  const newTemplates = `
  "space-rift": {
    key: "space-rift",
    displayName: "우주의 균열",
    shape: "Vertical6",
    canRotate: true,
    canFlip: false,
    affixSlots: [],
    fixedAffixes: [
      { text: "왼쪽 석판의 중위 재능을 해당 석판으로 복제한다.", direction: "left" },
      { text: "오른쪽 석판의 중위 재능을 해당 석판으로 복제한다.", direction: "right" },
    ],
    description: "왼쪽/오른쪽 석판의 중위 재능을 복제하는 석판",
  },
  "residence-of-stars": {
    key: "residence-of-stars",
    displayName: "별들의 고향",
    shape: "Pinwheel",
    canRotate: true,
    canFlip: true,
    affixSlots: [],
    fixedAffixes: [
      { text: "인접 석판의 중위 재능을 해당 석판으로 복제한다. 레전드 중위 재능은 복제할 수 없다." },
    ],
    description: "인접 석판의 중위 재능을 복제하는 석판",
  }`;

  if (!templates.includes("space-rift")) {
    // LEGENDARY_SLATE_TEMPLATES 객체 끝부분에 삽입
    templates = templates.replace(
      /\s*\};\s*export const LEGENDARY_SLATE_KEYS/,
      `,${newTemplates}\n};\n\nexport const LEGENDARY_SLATE_KEYS`,
    );
    await writeFile(templatesPath, templates, "utf-8");
    console.log("✅ src/lib/legendary-slate-templates.ts 업데이트 완료");
  } else {
    console.log("⏭️ legendary-slate-templates.ts는 이미 업데이트되어 있습니다.");
  }

  // 포맷팅 적용
  console.log("🎨 코드 포맷팅 중...");
  execSync("pnpm format", { stdio: "inherit" });
  console.log("🎉 모든 작업이 완료되었습니다!");
};

main().catch(console.error);
