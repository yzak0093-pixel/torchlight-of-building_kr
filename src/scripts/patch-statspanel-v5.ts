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

  // 1. 계산 엔진에서 처리된 어떤 스킬이든 무조건 옵션을 훔쳐오는 강력한 폴백 로직
  content = content.replace(
    /const offenseSummary =[\s\S]*?skills\[selectedSkill\] : undefined;/,
    `const offenseSummary = (selectedSkill && skills[selectedSkill]) ? skills[selectedSkill] : Object.values(skills)[0];`,
  );

  // 2. 바보 같은 텍스트가 있던 UI 영역을 통째로 썰어내고 올바른 안내문으로 교체
  const splitToken = "{/* 🚀 전체 적용 옵션";
  if (content.includes(splitToken)) {
    const parts = content.split(splitToken);
    const newUI = `{/* 🚀 전체 적용 옵션 동적 렌더링 섹션 (5차 완벽 패치) */}
                {groupedMods ? (
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
                ) : (
                  <div className="col-span-2 mt-4 bg-red-900/30 p-4 rounded-lg border border-red-700/50 text-center">
                    <span className="text-red-400 font-bold">⚠️ 엔진 계산 대기 중</span><br/>
                    <span className="text-zinc-300 text-sm mt-2 block leading-relaxed">
                      현재 장비 옵션을 불러오기 위한 <b>[기준 스킬]</b>이 계산기에 선택되지 않았습니다.<br/>
                      <span className="text-amber-400 font-bold mt-1 block">상단 메뉴의 [계산(Calculations)] 탭으로 이동하셔서<br/>드롭다운에서 아무 스킬이나 한 번만 선택해 주시면 즉시 모든 옵션이 출력됩니다!</span>
                    </span>
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
    content = parts[0] + newUI;
  }

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [고급 스탯 모달 UI 5차 패치 완료] 모순된 텍스트 삭제 및 스마트 렌더링 적용 완료!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
