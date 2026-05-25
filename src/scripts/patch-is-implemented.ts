import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "skills",
  "is-implemented.ts",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 함수가 시작되자마자 묻지도 따지지도 않고 true를 반환하도록 강제 수정합니다.
  content = content.replace(
    /export const isSkillImplemented = \(skill: BaseSkill\): boolean => \{/,
    "export const isSkillImplemented = (skill: BaseSkill): boolean => {\n  return true; // 🚀 모든 스킬 계산기 프리패스 강제 허용",
  );

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [VIP 명단 패치 완료] 이제 계산창(Calculations) 목록에 모든 액티브 스킬이 표시됩니다!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
