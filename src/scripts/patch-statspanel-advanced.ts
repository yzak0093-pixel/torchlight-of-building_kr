import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "builder",
  "StatsPanel.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 1. 필요한 유틸 함수 및 렌더링 컴포넌트(ModGroup) 임포트 추가
  if (!content.includes("groupModsByEffect")) {
    const importSearch =
      /import { formatStatValue } from "\.\.\/\.\.\/lib\/calculations-utils";/;
    const importReplace = `import { formatStatValue, getStatCategoryLabel, getStatCategoryDescription, groupModsByEffect, STAT_CATEGORIES } from "../../lib/calculations-utils";\nimport { ModGroup } from "../../components/calculations/ModGroup";`;
    content = content.replace(importSearch, importReplace);
  }

  // 2. 엔진이 인식한 모든 스탯(오라, 버프 등)을 가져오는 그룹화 로직 추가
  if (!content.includes("groupedMods = offenseSummary")) {
    const varSearch =
      /const offenseSummary =\s*selectedSkill !== undefined\s*\?\s*skills\[selectedSkill\] : undefined;/;
    const varReplace = `const offenseSummary = selectedSkill !== undefined ? skills[selectedSkill] : undefined;\n  const groupedMods = offenseSummary ? groupModsByEffect(offenseSummary.resolvedMods) : undefined;`;
    content = content.replace(varSearch, varReplace);
  }

  // 3. 모달 UI 내부에 '전체 적용 옵션(신속, 오라 등)' 동적 렌더링 섹션 주입
  if (!content.includes("전체 적용 옵션 (All Applied Mods)")) {
    const injectionPoint = `})()}`;
    const newUI = `})()}

                {/* 🚀 전체 적용 옵션 동적 렌더링 섹션 */}
                {groupedMods && (
                  <div className="col-span-2 mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                    <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                      장비 및 패시브 전체 적용 옵션 (All Applied Mods)
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {STAT_CATEGORIES.map((category) => {
                        const mods = groupedMods[category];
                        if (!mods || mods.length === 0) return null;
                        return (
                          <ModGroup
                            key={category}
                            title={getStatCategoryLabel(category)}
                            description={getStatCategoryDescription(category)}
                            mods={mods}
                            defaultExpanded={false}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}`;
    content = content.replace(injectionPoint, newUI);
  }

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [고급 스탯 모달 UI 패치 완료] 엔진이 인식한 모든 오라, 버프, 특수 옵션이 모달창에 동적으로 표시됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
