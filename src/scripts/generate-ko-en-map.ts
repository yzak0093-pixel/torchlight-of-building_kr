import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { execSync } from "node:child_process";

const GEAR_DIR_KO = join(process.cwd(), ".garbage", "tlidb", "gear");
const GEAR_DIR_EN = join(process.cwd(), ".garbage", "tlidb-en", "gear");
const OUT_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

// DB 추출 시 사용하는 완벽히 동일한 텍스트 파싱 로직
const parseModifierText = (
  el: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
): string => {
  const clone = el.clone();
  clone.find("e").each((_, elem) => {
    $(elem).replaceWith($(elem).text());
  });
  clone.find("i.fa-solid").remove();
  let html = clone.html() || "";
  html = html.replace(/<br\s*\/?>/gi, "{NEWLINE}");
  const processed = cheerio.load(html);
  let text = processed.text();
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/{NEWLINE}\s*/g, "\n");
  text = text
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/&ndash;/g, "-");
  return text.trim();
};

const toPatternKey = (text: string): string =>
  text
    .replace(/\d+(\.\d+)?/g, "{N}")
    .replace(/\s+/g, " ")
    .trim();

const main = async () => {
  const koFiles = await readdir(GEAR_DIR_KO);
  const enFiles = await readdir(GEAR_DIR_EN);
  const commonFiles = koFiles.filter(
    (f) => f.endsWith(".html") && enFiles.includes(f),
  );

  console.log(
    `🔍 HTML 전체 데이터 기반 정밀 매칭 시작 (총 ${commonFiles.length}개 장비 파일)`,
  );

  const exactMap = new Map<string, string>();

  for (const file of commonFiles) {
    const koHtml = await readFile(join(GEAR_DIR_KO, file), "utf-8");
    const enHtml = await readFile(join(GEAR_DIR_EN, file), "utf-8");
    const $ko = cheerio.load(koHtml);
    const $en = cheerio.load(enHtml);

    // 1. 고유 ID(data-modifier-id) 매칭
    $ko("span[data-modifier-id]").each((_, el) => {
      const id = $ko(el).attr("data-modifier-id");
      const enEl = $en(`span[data-modifier-id="${id}"]`);
      if (id && enEl.length) {
        const koText = parseModifierText($ko(el), $ko);
        const enText = parseModifierText(enEl, $en);
        if (koText && enText && /[가-힣]/.test(koText))
          exactMap.set(koText, enText);
      }
    });

    // 2. 누락되었던 "기본 스탯 (Base Gear Stats)" 1:1 매칭
    $ko("#Item .col").each((i, el) => {
      const $enCol = $en("#Item .col").eq(i);
      if (!$enCol.length) return;

      const $koStats = $ko(el).find(".flex-grow-1").children("div");
      const $enStats = $enCol.find(".flex-grow-1").children("div");

      $koStats.each((j, div) => {
        const $koDiv = $ko(div);
        const $enDiv = $enStats.eq(j);
        if (!$enDiv.length) return;

        const koText = $koDiv.text().trim();
        if (koText.startsWith("Require") || !koText) return;

        const koChildDivs = $koDiv.children("div");
        const enChildDivs = $enDiv.children("div");

        if (koChildDivs.length > 0) {
          koChildDivs.each((k, childDiv) => {
            const statKo = parseModifierText($ko(childDiv), $ko);
            const statEn = parseModifierText(enChildDivs.eq(k), $en);
            if (statKo && statEn && /[가-힣]/.test(statKo))
              exactMap.set(statKo, statEn);
          });
        } else {
          const statKo = parseModifierText($koDiv, $ko);
          const statEn = parseModifierText($enDiv, $en);
          if (statKo && statEn && /[가-힣]/.test(statKo))
            exactMap.set(statKo, statEn);
        }
      });
    });

    // 3. 기타 누락 테이블 강제 매칭
    $ko("table tbody tr").each((i, el) => {
      const $enRow = $en("table tbody tr").eq(i);
      if (!$enRow.length) return;

      $ko(el)
        .find("td")
        .each((j, td) => {
          const $enTd = $enRow.find("td").eq(j);
          if ($ko(td).find(".text-mod").length > 0) {
            const statKo = parseModifierText($ko(td), $ko);
            const statEn = parseModifierText($enTd, $en);
            if (statKo && statEn && /[가-힣]/.test(statKo))
              exactMap.set(statKo, statEn);
          }
        });
    });
  }

  // 패턴 맵(수치 변동 대응) 생성
  const patternMap = new Map<string, string>();
  for (const [ko, en] of exactMap.entries()) {
    const koPat = toPatternKey(ko);
    const enPat = toPatternKey(en);
    if (!patternMap.has(koPat)) {
      patternMap.set(koPat, enPat);
    }
  }

  console.log(
    `✅ 수집 완료! 정밀 매칭: ${exactMap.size}개, 패턴 매칭: ${patternMap.size}개 옵션 확보`,
  );

  const exactEntries = [...exactMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ko, en]) => `  ${JSON.stringify(ko)}: ${JSON.stringify(en)},`)
    .join("\n");

  const patternEntries = [...patternMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ko, en]) => `  ${JSON.stringify(ko)}: ${JSON.stringify(en)},`)
    .join("\n");

  const output = `// This file is machine-generated. Do not modify manually.
// Maps Korean craftableAffix text to English equivalents for mod parsing.
// Scrapes ALL combinations directly from HTML structures.

export const KO_EN_AFFIX_MAP: Readonly<Record<string, string>> = {
${exactEntries}
};

export const KO_EN_PATTERN_MAP: Readonly<Record<string, string>> = {
${patternEntries}
};

export const translateAffixToEn = (text: string): string => {
  const t = text.trim();

  // 1. 1:1 완벽 일치 매칭
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  // 2. 숫자가 변동된 패턴 매칭
  const numbers: string[] = [];
  const koPat = t.replace(/\\d+(\\.\\d+)?/g, (n) => {
    numbers.push(n);
    return "{N}";
  }).replace(/\\s+/g, " ");

  const enPat = KO_EN_PATTERN_MAP[koPat];
  if (enPat) {
    let i = 0;
    return enPat.replace(/\\{N\\}/g, () => numbers[i++] || "");
  }

  // 3. 최후의 보루 (정규식 예외 처리)
  let fb = t;
  fb = fb.replace(/해당 장비 보호막 \\+?(\\d+)%/, "+$1% gear energy shield");
  fb = fb.replace(/해당 장비 보호막 \\+?(\\d+)/, "+$1 gear energy shield");
  fb = fb.replace(/해당 장비 회피 수치 \\+?(\\d+)%/, "+$1% gear evasion");
  fb = fb.replace(/해당 장비 회피 수치 \\+?(\\d+)/, "+$1 gear evasion");
  fb = fb.replace(/해당 장비 방어도 \\+?(\\d+)%/, "+$1% gear armor");
  fb = fb.replace(/해당 장비 방어도 \\+?(\\d+)/, "+$1 gear armor");
  fb = fb.replace(/최대 보호막 추가 \\+?(\\d+)%/, "+$1% additional max energy shield");
  fb = fb.replace(/최대 보호막 \\+?(\\d+)/, "+$1 max energy shield");
  fb = fb.replace(/최대 HP \\+?(\\d+)%/, "+$1% max life");
  fb = fb.replace(/최대 HP \\+?(\\d+)/, "+$1 max life");
  fb = fb.replace(/최대 MP \\+?(\\d+)%/, "+$1% max mana");
  fb = fb.replace(/최대 MP \\+?(\\d+)/, "+$1 max mana");
  fb = fb.replace(/지혜 \\+?(\\d+)%/, "+$1% intelligence");
  fb = fb.replace(/지혜 \\+?(\\d+)/, "+$1 intelligence");
  fb = fb.replace(/지능 \\+?(\\d+)%/, "+$1% intelligence");
  fb = fb.replace(/지능 \\+?(\\d+)/, "+$1 intelligence");
  fb = fb.replace(/민첩 \\+?(\\d+)%/, "+$1% dexterity");
  fb = fb.replace(/민첩 \\+?(\\d+)/, "+$1 dexterity");
  fb = fb.replace(/힘 \\+?(\\d+)%/, "+$1% strength");
  fb = fb.replace(/힘 \\+?(\\d+)/, "+$1 strength");
  fb = fb.replace(/냉기 저항 \\+?(\\d+)%?/, "+$1% cold resistance");
  fb = fb.replace(/화염 저항 \\+?(\\d+)%?/, "+$1% fire resistance");
  fb = fb.replace(/번개 저항 \\+?(\\d+)%?/, "+$1% lightning resistance");
  fb = fb.replace(/부식 저항 \\+?(\\d+)%?/, "+$1% erosion resistance");
  fb = fb.replace(/원소\\s*저항 \\+?(\\d+)%?/, "+$1% elemental resistance");
  fb = fb.replace(/크리티컬 대미지 감면 \\+?(\\d+)%?/, "+$1% critical strike damage mitigation");
  fb = fb.replace(/크리티컬 수치 \\+?(\\d+)%?/, "+$1% critical strike rating");
  fb = fb.replace(/공격 및 주술 크리티컬 수치 \\+?(\\d+)/, "+$1 attack and spell critical strike rating");
  fb = fb.replace(/수확 회복 속도 \\+?(\\d+)%?/, "+$1% reap recovery speed");
  fb = fb.replace(/수확\\s*시간 \\+?(\\d+)%\\s*\\.?/, "+$1% reaping duration");
  fb = fb.replace(/공격 속도 ([+-]?\\d+(?:\\.\\d+)?)%?/, "$1% attack speed");
  fb = fb.replace(/받은 물리 대미지의 (\\d+)% 가 냉기 대미지로 전환/, "converts $1% of physical damage taken to cold damage");
  fb = fb.replace(/추가 저주를 (\\d+)\\s*개 시전할 수 있다\\./, "you can cast $1 additional curse(s)");
  
  return fb;
};
`;

  await writeFile(OUT_FILE, output, "utf-8");

  try {
    execSync("pnpm format", { stdio: "inherit" });
  } catch (e) {}
  console.log(`🎉 [완료] 게임 내 모든 옵션 데이터 매칭 및 사전 구축 완료!`);
};

main().catch(console.error);
