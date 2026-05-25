import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const OFFENSE_FILE = join(process.cwd(), "src", "tli", "calcs", "offense.ts");
const STATSPANEL_FILE = join(
  process.cwd(),
  "src",
  "components",
  "builder",
  "StatsPanel.tsx",
);

const main = async () => {
  // 1. 엔진 파일(offense.ts) 수술: 버려지던 전체 옵션 주머니를 밖으로 꺼냅니다.
  let offense = await readFile(OFFENSE_FILE, "utf-8");

  if (!offense.includes("globalMods?: Mod[];")) {
    offense = offense.replace(
      /(export interface OffenseResults \{[\s\S]*?heroTraitLevels: HeroTraitLevel\[\];)/,
      `$1\n  globalMods?: Mod[];`,
    );
  }

  if (!offense.includes("globalMods: unresolvedLoadoutAndBuffMods")) {
    offense = offense.replace(
      /(heroTraitLevels: heroTraitResult\.traitLevels,)/,
      `$1\n    globalMods: unresolvedLoadoutAndBuffMods,`,
    );
  }
  await writeFile(OFFENSE_FILE, offense, "utf-8");

  // 2. 모달 UI 파일(StatsPanel.tsx) 수술: 스킬 눈치를 보지 않고 다이렉트로 옵션을 가져옵니다.
  let statsPanel = await readFile(STATSPANEL_FILE, "utf-8");

  // 기존에 스킬에 의존하던 옵션 가져오기 로직 완전 삭제 및 교체
  statsPanel = statsPanel.replace(
    /const offenseSummary =[\s\S]*?(?=const hasDamageStats)/,
    `const offenseSummary = selectedSkill !== undefined ? skills[selectedSkill] : undefined;\n  // 🚀 스킬 계산 실패와 무관하게 엔진 최상단의 옵션을 직결합니다.\n  const groupedMods = offenseResults.globalMods ? groupModsByEffect(offenseResults.globalMods) : undefined;\n  `,
  );

  // 모달창 아래쪽 UI를 무조건 렌더링되도록 완전히 뜯어고칩니다.
  const splitToken = "{/* 🚀 전체 적용 옵션";
  if (statsPanel.includes(splitToken)) {
    const parts = statsPanel.split(splitToken);
    const newUI = `{/* 🚀 전체 적용 옵션 다이렉트 렌더링 (최종 종결) */}
                {groupedMods ? (
                  <div className="col-span-2 mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                    <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1 flex justify-between items-end">
                      <span>장비 및 패시브 전체 적용 옵션 (All Applied Mods)</span>
                      <span className="text-xs text-amber-200/50 font-normal">스킬 무관 다이렉트 출력 중</span>
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
                ) : (
                  <div className="col-span-2 mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 text-center text-zinc-400">
                    장착된 장비나 활성화된 패시브 옵션이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;
    statsPanel = parts[0] + newUI;
  }

  await writeFile(STATSPANEL_FILE, statsPanel, "utf-8");

  console.log(
    "✅ [최종 엔진 분리 패치 완료] 스킬 뻗음 현상과 무관하게 모든 장비 옵션이 다이렉트로 출력됩니다!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
