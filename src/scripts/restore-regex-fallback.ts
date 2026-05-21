import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const mapPath = join(
    process.cwd(),
    "src",
    "tli",
    "mod-parser",
    "ko-en-affix-map.ts",
  );
  let content = await readFile(mapPath, "utf-8");

  // 1:1 사전이나 패턴 맵에 없을 때(if (!enPat)) 실행할 정규식 번역 로직
  const target = "if (!enPat) return text;";
  const replacement = `if (!enPat) {
    let t = text.trim();
    
    // 방어 기제 및 기본 자원
    t = t.replace(/해당 장비 보호막 \+?(\d+)/, "+$1 gear energy shield");
    t = t.replace(/해당 장비 회피 수치 \+?(\d+)/, "+$1 gear evasion");
    t = t.replace(/해당 장비 방어도 \+?(\d+)/, "+$1 gear armor");
    t = t.replace(/최대 HP \+?(\d+)/, "+$1 max life");
    t = t.replace(/최대 MP \+?(\d+)/, "+$1 max mana");

    // 능력치 (힘, 민첩, 지능, 지혜)
    t = t.replace(/지혜 \+?(\d+)/, "+$1 intelligence");
    t = t.replace(/지능 \+?(\d+)/, "+$1 intelligence");
    t = t.replace(/민첩 \+?(\d+)/, "+$1 dexterity");
    t = t.replace(/힘 \+?(\d+)/, "+$1 strength");

    // 저항력
    t = t.replace(/냉기 저항 \+?(\d+)%?/, "+$1% cold resistance");
    t = t.replace(/화염 저항 \+?(\d+)%?/, "+$1% fire resistance");
    t = t.replace(/번개 저항 \+?(\d+)%?/, "+$1% lightning resistance");
    t = t.replace(/부식 저항 \+?(\d+)%?/, "+$1% erosion resistance");
    t = t.replace(/원소\s*저항 \+?(\d+)%?/, "+$1% elemental resistance");

    // 기타 주요 옵션
    t = t.replace(/공격 속도 ([+-]?\d+(?:\.\d+)?)%?/, "$1% attack speed");
    t = t.replace(/베기 스킬 범위 \+?(\d+)%?/, "+$1% skill area");
    t = t.replace(/추가 저주를 (\d+)\s*개 시전할 수 있다\./, "you can cast $1 additional curse(s)");
    t = t.replace(/(\d+) 레벨 (.*?)가 메인 스킬을 보조한다\./, "the main skill is supported by lv. $1 $2");

    return t;
  }`;

  if (content.includes("해당 장비 보호막")) {
    console.log("✅ 이미 정규식 예외 처리 로직이 적용되어 있습니다.");
    return;
  }

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    await writeFile(mapPath, content, "utf-8");
    console.log(
      "✅ ko-en-affix-map.ts에 기본 스탯 정규식 예외 처리(Fallback) 복구 완료!",
    );

    try {
      execSync("pnpm format", { stdio: "inherit" });
    } catch (e) {}
  } else {
    console.log(
      "⚠️ 교체할 코드를 찾지 못했습니다. 파일 구조가 변경되었을 수 있습니다.",
    );
  }
};

main().catch(console.error);
