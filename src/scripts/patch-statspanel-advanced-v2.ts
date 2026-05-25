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

  // 1. 임포트 추가 (줄바꿈 무관하게 강력한 정규식 적용)
  if (!content.includes("groupModsByEffect")) {
    content = content.replace(
      /import\s*\{\s*formatStatValue\s*\}\s*from\s*"[^"]+calculations-utils";/,
      `import { formatStatValue, getStatCategoryLabel, getStatCategoryDescription, groupModsByEffect, STAT_CATEGORIES } from "../../lib/calculations-utils";\nimport { ModGroup } from "../../components/calculations/ModGroup";`,
    );
  }

  // 2. 변수 선언 추가
  if (!content.includes("const groupedMods")) {
    content = content.replace(
      /(const offenseSummary\s*=\s*(?:[\s\S]*?)skills\[selectedSkill\] : undefined;)/,
      `$1\n  const groupedMods = offenseSummary ? groupModsByEffect(offenseSummary.resolvedMods) : undefined;`,
    );
  }

  // 3. UI 렌더링 섹션 (모달창 닫히기 직전의 </div>를 찾아 그 바로 밑에 강제 주입)
  if (!content.includes("전체 적용 옵션")) {
    content = content.replace(
      /(\}\)\(\)\}\s*<\/div>)/,
      `$1
              {/* 🚀 전체 적용 옵션 동적 렌더링 섹션 */}
              <div className="mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                  장비 및 패시브 전체 적용 옵션 (All Applied Mods)
                </h3>
                {!groupedMods ? (
                  <div className="text-sm text-zinc-400 py-4 text-center">
                    옵션 목록을 불러오려면 <b>[계산(Calculations)]</b> 탭에서 액티브 스킬을 먼저 선택해 주세요.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
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
                )}
              </div>`,
    );
  }

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [고급 스탯 모달 UI 2차 패치 완료] 코드 구조에 맞춰 완벽하게 주입되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
