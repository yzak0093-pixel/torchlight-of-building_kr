import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  // 1. 액티브 스킬 툴팁 패치
  const activeFile = join(
    process.cwd(),
    "src",
    "components",
    "skills",
    "SkillTooltipContent.tsx",
  );
  let activeContent = await readFile(activeFile, "utf-8");

  // Skill not supported 경고문 렌더링 블록을 정규식으로 완벽하게 날려버립니다.
  const activeRegex =
    /\{\!implemented\s*&&\s*\(\s*<div[^>]*>\s*Skill not supported in TOB yet\s*<\/div>\s*\)\}/g;
  activeContent = activeContent.replace(activeRegex, "");

  await writeFile(activeFile, activeContent, "utf-8");

  // 2. 보조 스킬 툴팁 패치
  const supportFile = join(
    process.cwd(),
    "src",
    "components",
    "skills",
    "SupportSkillSelectedTooltipContent.tsx",
  );
  let supportContent = await readFile(supportFile, "utf-8");

  // (Mod not supported in TOB yet) 경고문 렌더링 블록 제거
  const supportRegex =
    /\{\!isImplemented\s*&&\s*\(\s*<div[^>]*>\s*\(Mod not supported in TOB yet\)\s*<\/div>\s*\)\}/g;
  supportContent = supportContent.replace(supportRegex, "");

  await writeFile(supportFile, supportContent, "utf-8");

  console.log(
    "✅ [스킬 툴팁 UI 패치 완료] 모든 스킬창에서 거슬리는 빨간색 경고문이 깔끔하게 제거되었습니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
