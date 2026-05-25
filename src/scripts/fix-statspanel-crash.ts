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

  // 1. 조그만 부품(StatLine)에 잘못 들어간 장비 추출 코드를 정규식으로 찾아서 오려냅니다.
  const wrongLogicRegex =
    /const loadout = useLoadout\(\);[\s\S]*?return \{ auraEffect, reservation, maxIgnite, magicBurst, hasHaste \};\s*\}\)\(\);/;
  const match = content.match(wrongLogicRegex);

  if (match) {
    const snippet = match[0];

    // 원래 있던 잘못된 자리에서 코드를 지웁니다.
    content = content.replace(wrongLogicRegex, "");

    // 2. 화면을 그리는 본체(StatsPanel)의 시작 부분에 코드를 정확히 붙여넣습니다.
    const targetMarker = "export const StatsPanel = (): React.ReactNode => {";
    content = content.replace(
      targetMarker,
      targetMarker + "\n  " + snippet + "\n",
    );

    await writeFile(STATSPANEL_FILE, content, "utf-8");
    console.log(
      "✅ [에러 창 복구 완료] 엉뚱한 곳에 있던 코드를 본체로 정확하게 이동시켜 크래시를 해결했습니다!",
    );

    try {
      execSync("pnpm format", { stdio: "ignore" });
    } catch (e) {}
  } else {
    console.log(
      "❌ 잘못된 코드를 찾지 못했습니다. 이미 수정되었을 수 있습니다.",
    );
  }
};

main().catch(console.error);
