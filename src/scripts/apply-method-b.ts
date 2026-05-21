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
  let updated = false;

  // 1. disabled 조건 교체
  const disabledRegex =
    /disabled=\{\s*effectiveSelectedId === undefined\s*\|\|\s*selectedItem\?\.rarity === "legendary"\s*\}/;
  if (disabledRegex.test(content)) {
    content = content.replace(
      disabledRegex,
      "disabled={effectiveSelectedId === undefined}",
    );
    console.log("✅ disabled 조건에서 legendary 제외 완료");
    updated = true;
  }

  // 2. onClick 내부의 if 조건 교체
  const onClickRegex =
    /if\s*\(\s*selectedItem\?\.rarity === "legendary"|selectedItem\.rarity === "legendary"\s*\)\s*\{\s*setIsLegendaryModalOpen\(true\);\s*\}\s*else\s*if\s*\(\s*selectedItem\?\.rarity === "vorax"|selectedItem\.rarity === "vorax"\s*\)\s*\{/;

  if (onClickRegex.test(content)) {
    content = content.replace(
      onClickRegex,
      'if (selectedItem?.rarity === "vorax" || selectedItem.rarity === "vorax") {',
    );
    // 위 정규식 치환 시 남을 수 있는 OR 조건 찌꺼기 정리
    content = content.replace(
      /if \(\s*selectedItem\?\.rarity === "vorax" \|\| selectedItem\.rarity === "vorax"\s*\)/,
      'if (selectedItem.rarity === "vorax")',
    );
    console.log("✅ onClick 조건에서 legendary 모달 호출 제거 완료");
    updated = true;
  }

  if (updated) {
    await writeFile(targetPath, content, "utf-8");
    console.log("💾 파일 저장 완료!");

    try {
      console.log("🎨 포맷팅 적용 중...");
      execSync("pnpm format", { stdio: "inherit" });
      console.log(
        "🎉 작업이 성공적으로 완료되었습니다! 이제 브라우저에서 확인해 주세요.",
      );
    } catch (e) {
      console.error("포맷팅 중 오류가 발생했습니다.");
    }
  } else {
    console.log(
      "⚠️ 변경할 부분을 찾지 못했습니다. 이미 수정되었거나 코드가 다릅니다.",
    );
  }
};

main().catch(console.error);
