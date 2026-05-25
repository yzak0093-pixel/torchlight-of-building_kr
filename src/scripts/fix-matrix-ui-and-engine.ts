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
  // 1. 엔진 (offense.ts) 수술: 프로스트 스파이크 차단벽 완벽 철거
  let offense = await readFile(OFFENSE_FILE, "utf-8");

  // 주술 스킬 차단벽 철거 (Frost Spike 허용)
  const spellBlocker =
    /const implementedSpells: ActiveSkillName\[\] = \[[\s\S]*?\];\s*if \(\!implementedSpells\.includes\(skill\.name as ActiveSkillName\)\) \{\s*return undefined;\s*\}/;
  offense = offense.replace(
    spellBlocker,
    "// 🚀 주술 스킬(Frost Spike 등) 차단벽 해제 완료",
  );

  // 지속 스킬 차단벽 철거
  const persistentBlocker =
    /const implementedPersistentSkills: ActiveSkillName\[\] = \[[\s\S]*?\];\s*if \(\!implementedPersistentSkills\.includes\(skill\.name as ActiveSkillName\)\) \{\s*return undefined;\s*\}/;
  offense = offense.replace(
    persistentBlocker,
    "// 🚀 지속 스킬 차단벽 해제 완료",
  );

  await writeFile(OFFENSE_FILE, offense, "utf-8");

  // 2. 모달 UI (StatsPanel.tsx) 수술: 외계어 UI 롤백
  let statsPanel = await readFile(STATSPANEL_FILE, "utf-8");

  // 억지로 넣었던 외계어 출력 로직 삭제
  statsPanel = statsPanel.replace(
    /const offenseSummary = [^;]+;\s*\/\/\s*🚀[\s\S]*?const groupedMods = [^;]+;/,
    "const offenseSummary = selectedSkill !== undefined ? skills[selectedSkill] : undefined;",
  );

  // 모달창 하단을 원래의 깔끔한 UI 닫기 태그로 복구
  const splitToken = "{/* 🚀 전체 적용 옵션 다이렉트 렌더링 (최종 종결) */}";
  const startIndex = statsPanel.indexOf(splitToken);
  if (startIndex !== -1) {
    statsPanel =
      statsPanel.substring(0, startIndex) +
      "              </div>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n";
  }

  await writeFile(STATSPANEL_FILE, statsPanel, "utf-8");

  console.log(
    "✅ [최종 복구 완료] 외계어 UI가 삭제되었고, 프로스트 스파이크의 엔진 계산 차단벽이 철거되었습니다!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
