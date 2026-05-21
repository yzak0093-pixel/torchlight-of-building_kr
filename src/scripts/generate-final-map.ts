import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";

const GEAR_DIR_KO = join(process.cwd(), ".garbage", "tlidb", "gear");
const GEAR_DIR_EN = join(process.cwd(), ".garbage", "tlidb-en", "gear");
const OUT_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

// 텍스트 정규화 (수치 무시)
const normalize = (text: string) =>
  text
    .replace(/\d+(\.\d+)?/g, "{N}")
    .replace(/\s+/g, " ")
    .trim();

const main = async () => {
  const files = (await readdir(GEAR_DIR_KO)).filter((f) => f.endsWith(".html"));
  const koToEn = new Map<string, string>();

  for (const file of files) {
    const koHtml = await readFile(join(GEAR_DIR_KO, file), "utf-8");
    const enHtml = await readFile(join(GEAR_DIR_EN, file), "utf-8");
    const $ko = cheerio.load(koHtml);
    const $en = cheerio.load(enHtml);

    // 1. 모든 div 요소의 텍스트를 구조적으로 매칭
    const koDivs = $ko("div").toArray();
    koDivs.forEach((el, i) => {
      const koText = $ko(el).text().trim();
      if (/[가-힣]/.test(koText) && koText.length > 3) {
        const enText = $en("div").eq(i).text().trim();
        if (enText && !/[가-힣]/.test(enText)) {
          koToEn.set(koText, enText);
        }
      }
    });
  }

  const entries = [...koToEn.entries()]
    .map(([ko, en]) => `  ${JSON.stringify(ko)}: ${JSON.stringify(en)},`)
    .join("\n");

  const output = `export const KO_EN_AFFIX_MAP: Readonly<Record<string, string>> = {\n${entries}\n};\nexport const translateAffixToEn = (text: string): string => KO_EN_AFFIX_MAP[text.trim()] ?? text;`;

  await writeFile(OUT_FILE, output, "utf-8");
  console.log(`✅ 구조 추적 완료! 총 ${koToEn.size}개의 옵션 매핑 확보`);
};

main().catch(console.error);
