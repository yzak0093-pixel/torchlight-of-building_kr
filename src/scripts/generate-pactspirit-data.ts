import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import type {
  Pactspirit,
  PactspiritRingDetails,
} from "../data/pactspirit/types";

const BASE_URL = "https://tlidb.com/ko";
const PACTSPIRIT_LIST_URL = `${BASE_URL}/Pactspirit`;
const OUTPUT_DIR = join(process.cwd(), ".garbage", "tlidb");
const PACTSPIRITS_DIR = join(OUTPUT_DIR, "pactspirits");

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const fetchPage = async (url: string): Promise<string> => {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.text();
};

const extractNonDropPactspiritLinks = (html: string): string[] => {
  const colBlockRegex =
    /<div class="col"><div class="d-flex[^>]*>[\s\S]*?<\/div><\/div><\/div>/g;
  const hrefRegex = /href="([^"]+)"/;
  const links: string[] = [];
  const blocks = html.match(colBlockRegex) || [];

  for (const block of blocks) {
    // 한국어 및 영어 "드롭(Drop)" 정령 필터링
    if (
      block.includes("Increases Drop Quantity") ||
      block.includes("드롭 수량") ||
      block.includes("드롭 희귀도") ||
      block.includes("드랍")
    ) {
      continue;
    }
    const hrefMatch = block.match(hrefRegex);
    if (hrefMatch) {
      const href = hrefMatch[1];
      if (
        href &&
        !href.startsWith("http") &&
        !href.startsWith("#") &&
        !href.startsWith("/") &&
        !href.includes(".") &&
        !href.includes("?")
      ) {
        links.push(href);
      }
    }
  }
  return [...new Set(links)];
};

const fetchPactspiritPages = async (): Promise<void> => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(PACTSPIRITS_DIR, { recursive: true });

  const listHtml = await fetchPage(PACTSPIRIT_LIST_URL);
  const pactspiritLinks = extractNonDropPactspiritLinks(listHtml);
  console.log(`Found ${pactspiritLinks.length} non-drop pactspirit links`);

  for (const link of pactspiritLinks) {
    const decodedLink = decodeURIComponent(link);
    const filename = `${decodedLink}.html`;
    const filepath = join(PACTSPIRITS_DIR, filename);

    try {
      const url = `${BASE_URL}/${encodeURIComponent(decodedLink)}`;
      const html = await fetchPage(url);
      await writeFile(filepath, html);
      console.log(`Saved: ${filepath}`);
      await delay(200);
    } catch (error) {
      console.error(`Error fetching ${link}:`, error);
    }
  }
};

const cleanText = (html: string): string => {
  const $ = cheerio.load(`<root>${html}</root>`, { xml: false });
  $("root br").replaceWith("\n");
  const modifiers = $("root div.modifier");
  let text = "";
  if (modifiers.length > 0) {
    const lines: string[] = [];
    modifiers.each((_, el) => {
      const modText = $(el)
        .text()
        .replace(/[ \t]+/g, " ")
        .trim();
      if (modText.length > 0) lines.push(modText);
    });
    text = lines.join("\n");
  } else {
    text = $("root")
      .text()
      .replace(/[ \t]+/g, " ");
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
};

const cleanAffixText = (html: string): string => {
  const $ = cheerio.load(`<root>${html}</root>`, { xml: false });
  $("root br").replaceWith("\n");
  return $("root")
    .text()
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .trim();
};

const emptyRingDetails = (): PactspiritRingDetails => ({ name: "", affix: "" });

const extractPactspirit = (
  $: cheerio.CheerioAPI,
  filename: string,
): Pactspirit => {
  // 웹페이지의 실제 한국어 h1 타이틀을 추출 (없으면 파일명 사용)
  let name = $("h1").first().text().trim();
  if (!name) name = filename.replace(/\.html$/, "").replace(/_/g, " ");

  const spans = $("span.btn.btn-sm.btn-secondary.mb-1");
  let type = "Persistent"; // 기본값
  let rarity = "Magic";

  spans.each((_, span) => {
    const text = $(span).text().trim();
    if (text === "Legendary" || text === "전설") rarity = "Legendary";
    else if (text === "Rare" || text === "레어") rarity = "Rare";
    else if (text === "Magic" || text === "매직") rarity = "Magic";
    else {
      // 시스템 카테고리에 맞게 영문으로 매핑 보존 (UI 동작 보호)
      if (text === "공격" || text === "Attack") type = "Attack";
      else if (text === "생존" || text === "Survival") type = "Survival";
      else if (text === "지속" || text === "Persistent") type = "Persistent";
      else type = "Persistent";
    }
  });

  const innerRings: PactspiritRingDetails[] = [];
  const midRings: PactspiritRingDetails[] = [];

  $("div.flex-grow-1.ms-2").each((_, ringDiv) => {
    const divs = $(ringDiv).children("div");
    if (divs.length >= 3) {
      const ringName = $(divs[0]).text().trim();
      const affix = cleanAffixText($(divs[1]).html() || "");
      const ringType = $(divs[2]).text().trim();

      // 한국어 고리 이름 인식
      if (ringType.includes("Inner") || ringType.includes("안쪽")) {
        innerRings.push({ name: ringName, affix });
      } else if (ringType.includes("Mid") || ringType.includes("중간")) {
        midRings.push({ name: ringName, affix });
      }
    }
  });

  const effects: Record<string, string> = {};
  $("table.table tbody tr").each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length >= 2) {
      const level = $(tds[0]).text().trim();
      effects[`effect${level}`] = cleanText($(tds[1]).html() || "");
    }
  });

  return {
    type,
    rarity,
    name,
    innerRing1: innerRings[0] || emptyRingDetails(),
    innerRing2: innerRings[1] || emptyRingDetails(),
    innerRing3: innerRings[2] || emptyRingDetails(),
    innerRing4: innerRings[3] || emptyRingDetails(),
    innerRing5: innerRings[4] || emptyRingDetails(),
    innerRing6: innerRings[5] || emptyRingDetails(),
    midRing1: midRings[0] || emptyRingDetails(),
    midRing2: midRings[1] || emptyRingDetails(),
    midRing3: midRings[2] || emptyRingDetails(),
    affix1: effects.effect1 || "",
    affix2: effects.effect2 || "",
    affix3: effects.effect3 || "",
    affix4: effects.effect4 || "",
    affix5: effects.effect5 || "",
    affix6: effects.effect6 || "",
  };
};

const generateDataFile = (items: Pactspirit[]): string =>
  `// Machine-generated\nimport type { Pactspirit } from "./types";\n\nexport const Pactspirits = ${JSON.stringify(items, null, 2)} as const satisfies readonly Pactspirit[];\n`;

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  if (options.refetch) {
    console.log("Refetching pactspirit pages from tlidb...\n");
    await fetchPactspiritPages();
    console.log("");
  }

  const inputDir = join(process.cwd(), ".garbage", "tlidb", "pactspirits");
  const outDir = join(process.cwd(), "src", "data", "pactspirit");

  const files = await readdir(inputDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const pactspirits: Pactspirit[] = [];

  for (const filename of htmlFiles) {
    const html = await readFile(join(inputDir, filename), "utf-8");
    pactspirits.push(extractPactspirit(cheerio.load(html), filename));
  }

  pactspirits.sort((a, b) => a.name.localeCompare(b.name));
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "pactspirits.ts"),
    generateDataFile(pactspirits),
    "utf-8",
  );

  console.log(`Extracted ${pactspirits.length} pactspirits`);
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
export { main as generatePactspiritData };
