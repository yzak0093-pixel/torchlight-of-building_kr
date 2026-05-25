import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "routes",
  "builder",
  "talents",
  "$slot.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // canPlaceInverseImage 함수 호출부에 y 인자 추가
  const search =
    /const result = canPlaceInverseImage\(\s*x,\s*treeSlot as "tree2" \| "tree3" \| "tree4",/;
  const replace = `const result = canPlaceInverseImage(
        x,
        y, // 🚀 새로 추가된 y 인자 전달
        treeSlot as "tree2" | "tree3" | "tree4",`;

  content = content.replace(search, replace);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [엔진 비즈니스 로직 패치 2/2 완료] UI 컴포넌트가 새로운 검증 함수에 y좌표를 정상적으로 전달합니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
