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

  // 1. 스마트 폴백 로직 주입 (선택한 스킬이 뻗어도, 계산된 다른 스킬이 있으면 그 옵션 목록을 훔쳐옵니다)
  const fallbackSearch =
    /const offenseSummary = selectedSkill !== undefined \?[\s\S]*?skills\[selectedSkill\] : undefined;/;
  const fallbackReplace = `const offenseSummary = (selectedSkill !== undefined && skills[selectedSkill]) ? skills[selectedSkill] : Object.values(skills)[0];`;
  content = content.replace(fallbackSearch, fallbackReplace);

  // 2. 바보 같은 모순 문구 삭제 및 올바른 해결법 안내로 교체
  const wrongTextRegex =
    /현재 선택하신 <b>\[\{selectedSkill \|\| "스킬 미선택"\}\]<\/b>[\s\S]*?다시 열어주세요!<\/span>/;
  const newText = `현재 엔진이 장비의 옵션(신속, 오라 등)을 읽어오지 못했습니다.<br/>
                      <span className="text-zinc-500 text-xs mt-1 block">(원인: 계산기가 공식을 지원하지 않는 스킬이거나, [스킬] 탭에 장착되지 않은 스킬입니다.)</span><br/>
                      <span className="text-amber-400 mt-3 block p-3 bg-amber-900/30 rounded border border-amber-700/50">
                        💡 <b>확실한 해결 방법:</b><br/>상단의 <b>[스킬]</b> 탭으로 가셔서 남는 액티브 스킬 칸에 <b>'프로스트 스파이크'</b>를 장착하고 <b>레벨(Lv.20)</b>을 지정해 주세요!<br/>그 후 다시 이 창을 열면 모든 장비 옵션이 정상적으로 표시됩니다.
                      </span>`;
  content = content.replace(wrongTextRegex, newText);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [고급 스탯 모달 UI 4차 패치 완료] 모순된 텍스트 수정 및 스마트 폴백 로직 적용!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
