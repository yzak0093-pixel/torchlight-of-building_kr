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

  const startIndex = content.indexOf("{/* 🚀 전체 적용 옵션 동적 렌더링 섹션");
  if (startIndex === -1) {
    console.error("❌ 기존 패치 코드를 찾을 수 없습니다.");
    return;
  }

  // 숨김 조건을 완전히 없애고 무조건 렌더링되도록 코드를 교체합니다.
  const replacement = `{/* 🚀 전체 적용 옵션 동적 렌더링 섹션 (3차 패치) */}
                <div className="col-span-2 mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                    장비 및 패시브 전체 적용 옵션 (All Applied Mods)
                  </h3>
                  {!groupedMods ? (
                    <div className="text-sm text-zinc-400 py-4 text-center leading-relaxed">
                      현재 선택하신 <b>[{selectedSkill || "스킬 미선택"}]</b> 스킬은 아직 대미지 계산기가 공식을 지원하지 않아 엔진이 옵션을 요약하지 못했습니다.<br/>
                      <span className="text-amber-400 mt-2 block">💡 장비의 모든 옵션(신속, 오라 등)을 확인하시려면,<br/>[계산(Calculations)] 탭에서 임시로 <b>'프로스트 스파이크(Frost Spike)'</b>를 선택하신 후 다시 열어주세요!</span>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;

  content = content.substring(0, startIndex) + replacement;
  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [고급 스탯 모달 UI 3차 패치 완료] 숨김 조건이 제거되어 이제 무조건 화면에 렌더링됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
