import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "skills",
  "SupportSkillSelector.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 엔진의 엄격한 필터링 블록을 찾아냅니다. (호환성 필터링 전까지의 숭고/부귀 필터링 구역)
  const searchRegex =
    /\/\/\s*Add groups only if they have options[\s\S]*?(?=if\s*\(\s*available\.compatible\.length\s*>\s*0\s*\))/;

  const replacement = `// 🚀 모든 숭고, 부귀, 촉발 매개체를 엔진 필터링과 무관하게 무조건 목록에 강제 추가!
    const filteredAm = filterAndMap(ActivationMediumSkills.map((s) => s.name));
    if (filteredAm.length > 0) grps.push({ label: "Activation Medium", options: filteredAm });

    const filteredMag = filterAndMap(MagnificentSupportSkills.map((s) => s.name));
    if (filteredMag.length > 0) grps.push({ label: "Magnificent", options: filteredMag });

    const filteredNoble = filterAndMap(NobleSupportSkills.map((s) => s.name));
    if (filteredNoble.length > 0) grps.push({ label: "Noble", options: filteredNoble });

    `;

  content = content.replace(searchRegex, replacement);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [스킬 목록 2차 패치 완료] 엔진의 엄격한 호환성 검사를 무시하고 숭고/부귀 스킬이 목록에 강제로 표시됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
