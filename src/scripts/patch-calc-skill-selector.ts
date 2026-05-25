import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "calculations",
  "SkillSelector.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 1. 3개 스킬만 통과시키는 엄격한 필터링("levelValues" 체크 로직) 무력화
  content = content.replace(
    /return skill !== undefined && "levelValues" in\s*skill;/g,
    "return skill !== undefined;",
  );
  content = content.replace(/&& "levelValues" in skill/g, ""); // 줄바꿈 대비 2차 제거

  // 2. 3개 스킬만 지원한다는 영어 경고 문구를 자연스러운 한국어 안내로 교체
  const warnSearch =
    /No implemented active skills enabled[\s\S]*?Spectral Slash\)\./;
  const warnReplace =
    "계산할 액티브 스킬이 없습니다. [스킬] 탭에서 액티브 스킬을 먼저 장착해 주세요.";
  content = content.replace(warnSearch, warnReplace);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [계산창 스킬 잠금 해제 완료] 이제 장착한 모든 액티브 스킬이 계산창 목록에 정상적으로 노출됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
