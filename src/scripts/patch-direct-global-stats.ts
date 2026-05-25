import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const STATSPANEL_FILE = join(
  process.cwd(),
  "src",
  "components",
  "builder",
  "StatsPanel.tsx",
);

const main = async () => {
  let content = await readFile(STATSPANEL_FILE, "utf-8");

  // 1. 눈을 테러하던 외계어 Matrix UI 블록 완전히 삭제 및 원상 복구
  const matrixToken = "{/* 🚀 전체 적용 옵션";
  if (content.includes(matrixToken)) {
    content = content.substring(0, content.indexOf(matrixToken));
    content +=
      "              </div>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n";
  }

  // 2. 장비 데이터를 다이렉트로 읽어오기 위한 useLoadout 임포트 추가
  if (!content.includes("useLoadout")) {
    content = content.replace(
      /useCalculationsSelectedSkill\s*\} from "\.\.\/\.\.\/stores\/builderStore";/,
      `useCalculationsSelectedSkill, useLoadout } from "../../stores/builderStore";`,
    );
  }

  // 3. 스킬 계산 엔진을 완전히 무시하고 장비 텍스트에서 직접 오라/점유 효율을 뽑아내는 무적의 추출 로직 주입
  const calcLogic = `
  const loadout = useLoadout();

  const customStats = (() => {
    let auraEffect = 0;
    let reservation = 0;
    let maxIgnite = 0;
    let magicBurst = 0;
    let hasHaste = false;

    const processText = (rawText: string | undefined) => {
      if (!rawText) return;
      const text = rawText.toString();
      if (text.includes("오라 효과")) {
        const m = text.match(/([+-]?\\d+(?:\\.\\d+)?)/);
        if (m) auraEffect += parseFloat(m[1]);
      }
      if (text.includes("점유 효율") || text.includes("봉인 보상")) {
        const m = text.match(/([+-]?\\d+(?:\\.\\d+)?)/);
        if (m) reservation += parseFloat(m[1]);
      }
      if (text.includes("점화 최대치")) {
        const m = text.match(/([+-]?\\d+(?:\\.\\d+)?)/);
        if (m) maxIgnite += parseFloat(m[1]);
      }
      if (text.includes("매직 버스트 상한")) {
        const m = text.match(/([+-]?\\d+(?:\\.\\d+)?)/);
        if (m) magicBurst += parseFloat(m[1]);
      }
      if (text.includes("신속")) {
        hasHaste = true;
      }
    };

    if (loadout?.equipment) {
      Object.values(loadout.equipment).forEach(gear => {
        if (!gear) return;
        gear.implicitAffixes?.forEach(a => processText(a.text));
        gear.affixes?.forEach(a => processText(a.text));
        gear.corruptionAffixes?.forEach(a => processText(a.text));
        gear.legendaryAffixes?.forEach(a => processText(a.text || a.choiceDescriptor || ""));
      });
    }
    return { auraEffect, reservation, maxIgnite, magicBurst, hasHaste };
  })();

  return (`;

  content = content.replace(/return \(/, calcLogic);

  // 4. 모달창 맨 밑에 오라 및 특수 스탯 전용 깔끔한 UI 주입
  const uiInjection = `
                {/* 🚀 글로벌 특수 스탯 다이렉트 렌더링 (엔진 무관) */}
                <div className="col-span-2 mt-4 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1 flex justify-between items-end">
                    <span>✨ 오라 및 특수 스탯 요약</span>
                    <span className="text-xs text-amber-200/50 font-normal">장비 다이렉트 연동</span>
                  </h3>
                  <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded border border-zinc-700/30">
                    <StatLine label="오라 효과 (Aura Effect)" value={\`+\${Number(customStats.auraEffect.toFixed(1))}%\`} highlight={customStats.auraEffect > 0} />
                    <StatLine label="마나/생명력 점유 효율 (Reservation Efficiency)" value={\`+\${Number(customStats.reservation.toFixed(1))}%\`} highlight={customStats.reservation > 0} />
                    <StatLine label="매직 버스트 상한 (Magic Burst Limit)" value={\`+\${customStats.magicBurst}\`} highlight={customStats.magicBurst > 0} />
                    <StatLine label="점화 최대치 (Max Ignite Limit)" value={\`+\${customStats.maxIgnite}\`} highlight={customStats.maxIgnite > 0} />
                    {customStats.hasHaste && <StatLine label="신속 (Haste)" value="보유함 (Active)" highlight={true} color="text-amber-400" />}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                    * 위 스탯은 계산 엔진의 스킬 호환성과 무관하게, 장착하신 장비에서 다이렉트로 추출되어 무조건 표시됩니다.
                  </p>
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

  const injectionTarget =
    "              </div>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n";
  if (content.includes(injectionTarget)) {
    content = content.replace(injectionTarget, uiInjection);
  } else {
    content = content.replace(
      /(\}\)\(\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\);\s*\};\s*)$/,
      uiInjection,
    );
  }

  await writeFile(STATSPANEL_FILE, content, "utf-8");
  console.log(
    "✅ [오라/글로벌 스탯 독립 패치 완료] 끔찍한 외계어 UI가 삭제되고 장비 스탯을 직접 화면에 띄웁니다!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
