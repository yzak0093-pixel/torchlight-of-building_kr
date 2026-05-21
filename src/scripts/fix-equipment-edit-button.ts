import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const targetPath = join(
    process.cwd(),
    "src",
    "routes",
    "builder",
    "equipment.tsx",
  );
  let content = await readFile(targetPath, "utf-8");

  // 정규식을 사용해 기존 Edit 버튼의 disabled 및 onClick 로직 블록을 탐색합니다.
  const targetRegex =
    /disabled=\{[\s\S]*?effectiveSelectedId === undefined \|\|[\s\S]*?selectedItem\?\.rarity === "legendary"[\s\S]*?\}[\s\S]*?onClick=\{\(\) => \{[\s\S]*?if \([\s\S]*?effectiveSelectedId !== undefined &&[\s\S]*?selectedItem !== undefined[\s\S]*?\) \{[\s\S]*?if \(selectedItem\.rarity === "vorax"\) \{[\s\S]*?setVoraxEditItem\(selectedItem\);[\s\S]*?setIsVoraxModalOpen\(true\);[\s\S]*?\} else \{[\s\S]*?openEditModal\(effectiveSelectedId\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}\}/;

  // 레전더리 아이템 제한 해제 및 모달 오픈 로직이 추가된 새로운 코드
  const replacement = `disabled={effectiveSelectedId === undefined}
              onClick={() => {
                if (
                  effectiveSelectedId !== undefined &&
                  selectedItem !== undefined
                ) {
                  if (selectedItem.rarity === "legendary") {
                    setIsLegendaryModalOpen(true);
                  } else if (selectedItem.rarity === "vorax") {
                    setVoraxEditItem(selectedItem);
                    setIsVoraxModalOpen(true);
                  } else {
                    openEditModal(effectiveSelectedId);
                  }
                }
              }}`;

  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    await writeFile(targetPath, content, "utf-8");
    console.log(
      "✅ Edit 버튼의 레전더리 아이템 편집 제한 해제 및 로직 추가 완료!",
    );

    try {
      console.log("🎨 포맷팅 적용 중...");
      execSync("pnpm format", { stdio: "inherit" });
      console.log("🎉 완벽하게 적용되었습니다. 브라우저를 새로고침 하십시오!");
    } catch (e) {
      console.error("포맷팅 중 오류가 발생했습니다. 코드 구조를 확인하세요.");
    }
  } else {
    console.log(
      "⚠️ 매칭되는 코드를 찾을 수 없습니다. 코드가 이미 수정되었거나 형식이 다릅니다.",
    );
  }
};

main().catch(console.error);
