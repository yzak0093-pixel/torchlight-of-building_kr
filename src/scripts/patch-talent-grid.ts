import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "talents",
  "TalentGrid.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 1. 데드존 판별 변수 삽입 (정규식으로 안전하게 위치 탐색)
  const search1 =
    /const nodeIsInSourceArea = isInSourceAreaUtil\([\s\S]*?treeSlot,\n\s*\);/;
  const replace1 = `$&

              // 🚫 역상 장착 불가 구역 (6, 9, 12pts 의 가운데 3줄)
              const isInverseImageDeadZone = x >= 2 && x <= 4 && y >= 1 && y <= 3;`;

  content = content.replace(search1, replace1);

  // 2. 역상 배치 및 활성화 UI 차단
  const search2 =
    /isSelectingInverseImage=\{\!\!selectedInverseImage\}\s+onPlaceInverseImage=\{\s+onPlaceInverseImage\s+\?\s+\(\)\s+=>\s+onPlaceInverseImage\(x,\s+y\)\s+:\s+undefined\s+\}/;
  const replace2 = `isSelectingInverseImage={!!selectedInverseImage && !isInverseImageDeadZone}
                  onPlaceInverseImage={
                    onPlaceInverseImage && !isInverseImageDeadZone
                      ? () => onPlaceInverseImage(x, y)
                      : undefined
                  }`;

  content = content.replace(search2, replace2);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [역상 데드존 패치 완료] 6, 9, 12pts 중앙 영역(빨간색)에 역상 장착 슬롯이 비활성화되었습니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
