import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const GRID_FILE = join(
  process.cwd(),
  "src",
  "components",
  "talents",
  "TalentGrid.tsx",
);
const DISPLAY_FILE = join(
  process.cwd(),
  "src",
  "components",
  "talents",
  "TalentNodeDisplay.tsx",
);

const main = async () => {
  // --- 1. TalentNodeDisplay.tsx 패치 (과거 하드코딩 제거) ---
  let displayContent = await readFile(DISPLAY_FILE, "utf-8");
  displayContent = displayContent.replace(/&&\s*node\.x !== 3/g, "");
  await writeFile(DISPLAY_FILE, displayContent, "utf-8");

  // --- 2. TalentGrid.tsx 패치 ---
  let gridContent = await readFile(GRID_FILE, "utf-8");

  // 이전 패치 에러 찌꺼기 완벽 청소
  gridContent = gridContent.replace(
    /const isInverseImageDeadZone[^\n]*\n/g,
    "",
  );
  gridContent = gridContent.replace(
    /isSelectingInverseImage=\{\!\!selectedInverseImage && \!isInverseImageDeadZone\}/g,
    "isSelectingInverseImage={!!selectedInverseImage}",
  );
  gridContent = gridContent.replace(
    /onPlaceInverseImage && \!isInverseImageDeadZone\s*\?\s*\(\) => onPlaceInverseImage\(x, y\)\s*:\s*undefined/g,
    "onPlaceInverseImage ? () => onPlaceInverseImage(x, y) : undefined",
  );

  // 🚀 절대 실패하지 않는 위치에 데드존 선언 주입
  const searchTarget = "const node = nodeMap.get(`${x},${y}`);";
  const replacementTarget = `const node = nodeMap.get(\`\${x},\${y}\`);
              
              // 🚫 데드존 정의: 6, 9, 12pts 중앙 3줄 (y: 1~3)
              const isInverseImageDeadZone = x >= 2 && x <= 4 && y >= 1 && y <= 3;
              const nodeHasInverseImageRaw = hasInverseImageAtPosition(placedInverseImage, treeSlot, x, y);`;
  gridContent = gridContent.replace(searchTarget, replacementTarget);

  // 🚀 빈 공간(노란 구역) 전용 장착 슬롯 렌더링 로직 주입
  const emptyNodeSearch =
    /if \(!node\) \{\s*return <div key=\{\`\$\{x\}-\$\{y\}\`\} className="w-20 h-20" \/>;\s*\}/;
  const emptyNodeReplace = `if (!node) {
                if (nodeHasInverseImageRaw && placedInverseImage) {
                  return (
                    <TalentNodeDisplay
                      key={\`\${x}-\${y}\`}
                      node={{ maxPoints: 0, points: 0, x, y, affix: { affixLines: [] }, isReflected: false } as any}
                      canAllocate={false}
                      canDeallocate={false}
                      onAllocate={() => {}}
                      onDeallocate={() => {}}
                      hasInverseImage={true}
                      inverseImage={placedInverseImage.inverseImage}
                      onRemoveInverseImage={onRemoveInverseImage}
                      canRemoveInverseImage={canRemoveInverseImage(nodes) && !hasReflectedAllocations}
                    />
                  );
                }
                
                if (!!selectedInverseImage && !isInverseImageDeadZone) {
                  return (
                    <div
                      key={\`\${x}-\${y}\`}
                      className="relative w-20 h-20 rounded-lg border-2 transition-all border-cyan-500 bg-cyan-500/20 cursor-pointer hover:bg-cyan-500/30"
                      onClick={() => onPlaceInverseImage?.(x, y)}
                    >
                      <div className="absolute -top-2 -right-2">
                        <div className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">+</div>
                      </div>
                    </div>
                  );
                }
                return <div key={\`\${x}-\${y}\`} className="w-20 h-20" />;
              }`;
  gridContent = gridContent.replace(emptyNodeSearch, emptyNodeReplace);

  // 노드가 있는 곳의 데드존 방어
  gridContent = gridContent.replace(
    /isSelectingInverseImage=\{\!\!selectedInverseImage\}/,
    "isSelectingInverseImage={!!selectedInverseImage && !isInverseImageDeadZone}",
  );
  gridContent = gridContent.replace(
    /onPlaceInverseImage\s*\?\s*\(\) => onPlaceInverseImage\(x, y\)\s*:\s*undefined/,
    "onPlaceInverseImage && !isInverseImageDeadZone ? () => onPlaceInverseImage(x, y) : undefined",
  );

  await writeFile(GRID_FILE, gridContent, "utf-8");
  console.log(
    "✅ [에러 수정 및 역상 슬롯 패치 완료] 에러가 제거되었고, 빈 공간에도 인게임과 동일하게 장착 가능해졌습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
