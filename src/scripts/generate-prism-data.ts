import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import type { Prism } from "../data/prism/types";

const BASE_URL = "https://tlidb.com/ko";
const PRISM_PAGE_PATH = "Ethereal_Prism";
const OUTPUT_PATH = join(process.cwd(), ".garbage", "tlidb", "prism.html");

const fetchPrismPage = async (): Promise<void> => {
  const url = `${BASE_URL}/${PRISM_PAGE_PATH}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const html = await response.text();
  const dir = join(process.cwd(), ".garbage", "tlidb");
  await mkdir(dir, { recursive: true });
  await writeFile(OUTPUT_PATH, html, "utf-8");
};

const readCachedPrismPage = async (): Promise<string> =>
  readFile(OUTPUT_PATH, "utf-8");

const cleanTlidbHtml = (html: string): string => {
  const $ = cheerio.load(html, null, false);
  $("br").replaceWith("\n");
  $("e, span.Hyperlink").each((_, el) => {
    $(el).replaceWith($(el).text());
  });
  return $.text()
    .replace(/\u2013/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
};

const extractPrismData = (html: string): Prism[] => {
  const $ = cheerio.load(html);
  const items: Prism[] = [];
  const rows = $("table tbody tr");

  rows.each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length === 0) return;

    const affix = cleanTlidbHtml($(tds[0]).html() ?? "");
    if (!affix || affix.includes("Modifier") || affix.includes("옵션")) return;

    const col2 = tds.length > 1 ? $(tds[1]).text().trim() : "";

    let type = "Random Affix";
    let rarity = "";

    // 한국어 패턴을 시스템이 인식하는 영어 카테고리로 정확히 매핑
    if (
      col2 === "" ||
      affix.includes("핵심 재능 바꾸기") ||
      affix.includes("추가 효과 부여") ||
      col2.includes("기본")
    ) {
      type = "Base Affix";
    } else if (col2.includes("레어") || col2.includes("Rare")) {
      type = "Prism Gauge";
      rarity = "Rare";
    } else if (col2.includes("전설") || col2.includes("Legendary")) {
      type = "Prism Gauge";
      rarity = "Legendary";
    } else if (
      col2.includes("영역") ||
      col2.includes("범위") ||
      col2.toLowerCase().includes("area")
    ) {
      type = "Prism Area";
    } else if (
      col2.includes("돌연변이") ||
      col2.toLowerCase().includes("mutation")
    ) {
      type = "Mutation";
    } else {
      type = "Random Affix";
    }

    items.push({ type, rarity, affix });
  });
  return items;
};

const generateDataFile = (items: Prism[]): string =>
  `// Machine-generated\nimport type { Prism } from "./types";\n\nexport const Prisms: readonly Prism[] = ${JSON.stringify(items, null, 2)};\n`;

interface Options {
  refetch: boolean;
}
const main = async (options: Options): Promise<void> => {
  if (options.refetch) await fetchPrismPage();
  const html = await readCachedPrismPage();
  const items = extractPrismData(html);
  const outDir = join(process.cwd(), "src", "data", "prism");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "prisms.ts"), generateDataFile(items), "utf-8");
  execSync("pnpm format", { stdio: "inherit" });
};

program
  .option("--refetch")
  .action((options: Options) => {
    main(options)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  })
  .parse();
export { main as generatePrismData };
