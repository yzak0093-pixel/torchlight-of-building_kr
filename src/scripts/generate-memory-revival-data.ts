import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import { fetchPage } from "./tlidb-tools";

const BASE_URL = "https://tlidb.com/ko";
const PAGE_NAME = "Memory_Revival"; // tlidb 추억 재구성 페이지 주소
const CACHE_DIR = join(
  process.cwd(),
  ".garbage",
  "tlidb",
  "ko",
  "memory_revival",
);
const OUT_DIR = join(process.cwd(), "src", "data", "hero-memory");

/**
 * HTML 요소에서 텍스트 옵션을 깨끗하게 추출하는 함수 (한글 깨짐 및 줄바꿈 처리)
 */
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
  text = text.replace(/[\u2013\u2014]/g, "-").replace(/&ndash;/g, "-");

  return text;
};

/**
 * HTML 문서 내부의 테이블을 스캔하여 재구성 접사 데이터를 파싱합니다.
 */
const parseRevivalPage = (html: string): string[] => {
  const $ = cheerio.load(html);
  const affixes: string[] = [];

  // #제작, #재구성, 또는 모든 테이블을 순회하며 데이터 추출
  $("table").each((_, table) => {
    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const tds = $(row).find("td");
        if (tds.length === 0) return;

        // 보통 옵션 내용은 1번째 혹은 2번째 td에 위치합니다.
        // 텍스트가 존재하는 유효한 옵션만 추출
        const targetTd = tds.length >= 2 ? $(tds[1]) : $(tds[0]);
        const modifier = parseModifierText(targetTd, $);

        if (modifier && modifier.length > 0 && !affixes.includes(modifier)) {
          affixes.push(modifier);
        }
      });
  });

  return affixes;
};

const fetchRevivalPage = async (): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
  console.log("Refetching memory revival page from tlidb...");

  const url = `${BASE_URL}/${PAGE_NAME}`;
  const html = await fetchPage(url);
  await writeFile(join(CACHE_DIR, `${PAGE_NAME}.html`), html, "utf-8");
  console.log(`Saved cache to: ${CACHE_DIR}`);
};

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  // 1. 강제 다운로드 로직 (우회 패치 적용 상태 유지)
  if (true /* 무조건 다운로드 실행 */ || options.refetch) {
    await fetchRevivalPage();
    console.log("");
  }

  console.log("Reading memory revival file from cache...");
  const filePath = join(CACHE_DIR, `${PAGE_NAME}.html`);

  let html: string;
  try {
    html = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(`Missing cached file: ${filePath}`);
  }

  console.log("Processing memory revival data...");
  const revivalAffixes = parseRevivalPage(html);
  console.log(`  Extracted ${revivalAffixes.length} revival affixes.`);

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "revival-data.ts");

  const fileContent = `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-memory-revival-data.ts
export const HERO_MEMORY_REVIVAL_AFFIXES: readonly string[] = ${JSON.stringify(revivalAffixes, null, 2)};
`;

  await writeFile(outPath, fileContent, "utf-8");
  console.log(`Generated: ${outPath}`);
  console.log("\nCode generation complete!");

  execSync("pnpm format", { stdio: "inherit" });
};

program
  .description("Generate hero memory revival data from tlidb")
  .option("--refetch", "Refetch HTML pages before generating")
  .action((options: Options) => {
    main(options)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
      });
  })
  .parse();
