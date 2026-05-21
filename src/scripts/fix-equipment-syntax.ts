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

  // 에러 로그에 나타난 꼬여버린 문법 부분을 정확히 찾아서 깔끔한 방법 B 코드로 교체합니다.
  const brokenSyntaxRegex =
    /if\s*\(\s*selectedItem\.rarity === "legendary"\s*\)\s*\{\s*setIsLegendaryModalOpen\(true\);\s*\}\s*else\s*if\s*\(\s*if\s*\(\s*selectedItem\.rarity === "vorax"\s*\)\s*\{/g;

  if (brokenSyntaxRegex.test(content)) {
    content = content.replace(
      brokenSyntaxRegex,
      'if (selectedItem.rarity === "vorax") {',
    );
    await writeFile(targetPath, content, "utf-8");
    console.log("🩹 꼬여있던 if 문법 오류 완벽하게 제거 완료!");

    try {
      console.log("🎨 포맷팅 재시도 중...");
      execSync("pnpm format", { stdio: "inherit" });
      console.log(
        "🎉 포맷팅 완벽 통과! 브라우저를 새로고침 하시면 정상 작동할 것입니다.",
      );
    } catch (e) {
      console.error("포맷팅 중 오류가 발생했습니다.");
    }
  } else {
    console.log(
      "⚠️ 해당 오류 구문을 찾을 수 없습니다. 코드가 이미 수정되었을 수 있습니다.",
    );
  }
};

main().catch(console.error);
