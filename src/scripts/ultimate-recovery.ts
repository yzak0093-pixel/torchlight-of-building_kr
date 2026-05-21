import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { execSync } from "node:child_process";

const GEAR_DIR_KO = join(process.cwd(), ".garbage", "tlidb", "gear");
const GEAR_DIR_EN = join(process.cwd(), ".garbage", "tlidb-en", "gear");
const MAP_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

// {N} 치환 및 정규화
const toPattern = (text: string) =>
  text
    .replace(/[+-]?\d+(\.\d+)?/g, "{N}")
    .replace(/\s+/g, " ")
    .trim();

const main = async () => {
  console.log(
    "🚑 [긴급 복구] 박살난 사전 파일을 폐기하고 안전하게 재생성합니다...",
  );

  const files = (await readdir(GEAR_DIR_KO)).filter((f) => f.endsWith(".html"));
  const exactMap = new Map<string, string>();

  // 1. 데이터 파싱
  for (const file of files) {
    const koHtml = await readFile(join(GEAR_DIR_KO, file), "utf-8");
    const enHtml = await readFile(join(GEAR_DIR_EN, file), "utf-8");
    const $ko = cheerio.load(koHtml);
    const $en = cheerio.load(enHtml);

    // ID 기반 파싱 (가장 정확함)
    $ko("[data-modifier-id]").each((_, el) => {
      const id = $ko(el).attr("data-modifier-id");
      const enEl = $en(`[data-modifier-id="${id}"]`);
      if (id && enEl.length) {
        const koText = $ko(el)
          .text()
          .trim()
          .replace(/&ndash;/g, "-");
        const enText = enEl
          .text()
          .trim()
          .replace(/&ndash;/g, "-");
        if (koText && enText && /[가-힣]/.test(koText))
          exactMap.set(koText, enText);
      }
    });

    // ID 없는 기본 스탯 파싱 (구조 기반)
    $ko("div").each((i, el) => {
      const koText = $ko(el)
        .text()
        .trim()
        .replace(/&ndash;/g, "-");
      if (/[가-힣]/.test(koText) && koText.length > 2) {
        const enText = $en("div")
          .eq(i)
          .text()
          .trim()
          .replace(/&ndash;/g, "-");
        if (enText && !/[가-힣]/.test(enText)) exactMap.set(koText, enText);
      }
    });
  }

  // 2. 패턴 맵({N}) 생성
  const patternMap = new Map<string, string>();
  for (const [ko, en] of exactMap.entries()) {
    const koPat = toPattern(ko);
    const enPat = toPattern(en);
    if (!patternMap.has(koPat)) patternMap.set(koPat, enPat);
  }

  // 3. 파일 작성 (문법 오류가 발생할 수 없는 구조)
  const exactEntries = [...exactMap.entries()]
    .map(([ko, en]) => `  ${JSON.stringify(ko)}: ${JSON.stringify(en)},`)
    .join("\n");

  const patternEntries = [...patternMap.entries()]
    .map(([ko, en]) => `  ${JSON.stringify(ko)}: ${JSON.stringify(en)},`)
    .join("\n");

  const output = `// Machine-generated file. DO NOT modify manually.

export const KO_EN_AFFIX_MAP: Readonly<Record<string, string>> = {
${exactEntries}
};

export const KO_EN_PATTERN_MAP: Readonly<Record<string, string>> = {
${patternEntries}
};

export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 1. 완벽 일치 매칭
  if (KO_EN_AFFIX_MAP[t]) return KO_EN_AFFIX_MAP[t];

  // 2. 패턴({N}) 매칭
  const numbers: string[] = [];
  const koPat = t.replace(/[+-]?\\d+(\\.\\d+)?/g, (n) => {
    numbers.push(n);
    return "{N}";
  }).replace(/\\s+/g, " ");

  const enPat = KO_EN_PATTERN_MAP[koPat];
  if (enPat) {
    let i = 0;
    return enPat.replace(/\\{N\\}/g, () => numbers[i++] || "");
  }

  // 3. 최후의 보루 (정규식 예외 처리)
  t = t.replace(/보호막 에너지 충전 속도 \\+?(\\d+)%/, "+$1% energy shield charge speed");
  t = t.replace(/오라 효과 \\+?(\\d+)%/, "+$1% aura effect");
  t = t.replace(/MP 봉인 보상 \\+?(\\d+)%/, "+$1% sealed mana compensation");
  t = t.replace(/\\+?(\\d+)% 의 확률로 원소 상태 이상을 회피한다\\.?/, "+$1% chance to avoid elemental ailments");
  t = t.replace(/MP 자연 회복 속도 \\+?(\\d+)%/, "+$1% mana regeneration speed");
  t = t.replace(/레벨 화염 충전을 보유한다/, "Charged Flames");
  
  return t;
};
`;

  await writeFile(MAP_FILE, output, "utf-8");
  console.log(
    `✅ [복구 완료] ${exactMap.size}개의 완벽 매칭 데이터와 ${patternMap.size}개의 패턴 데이터가 안전하게 저장되었습니다.`,
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
