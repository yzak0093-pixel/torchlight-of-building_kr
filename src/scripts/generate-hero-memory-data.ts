import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import type { HeroMemory } from "../data/hero-memory/types";

// ============================================================================
// Fetching
// ============================================================================

const HERO_MEMORIES_URL = "https://tlidb.com/ko/Hero_Memories";
const HERO_MEMORIES_DIR = join(
  process.cwd(),
  ".garbage",
  "tlidb",
  "hero_memories",
);

const HERO_MEMORIES_FILES = [
  "hero_memories_base_stats.html",
  "hero_memories_fixed_affix.html",
  "hero_memories_random_affix.html",
] as const;

const fetchPage = async (url: string): Promise<string> => {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const fetchHeroMemoriesPages = async (): Promise<void> => {
  await mkdir(HERO_MEMORIES_DIR, { recursive: true });

  const html = await fetchPage(HERO_MEMORIES_URL);

  for (const filename of HERO_MEMORIES_FILES) {
    const filepath = join(HERO_MEMORIES_DIR, filename);
    await writeFile(filepath, html);
    console.log(`Saved: ${filepath}`);
  }

  console.log("Fetching complete!");
};

// ============================================================================
// Parsing
// ============================================================================

const TLIDB_HTML_PATH = join(
  HERO_MEMORIES_DIR,
  "hero_memories_random_affix.html",
);

const cleanAffixText = (html: string): string => {
  let text = html;

  text = text.replace(/\s*data-bs-title="[^"]*"/g, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<span[^>]*class="text-mod"[^>]*>([^<]*)<\/span>/g, "$1");
  text = text.replace(/<e[^>]*>([^<]*)<\/e>/g, "$1");
  text = text.replace(/<i[^>]*><\/i>/g, "");
  text = text.replace(/<i[^>]*\/>/g, "");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&ndash;/g, "-");
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/[^\S\n]+/g, " ");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
};

const extractTypeFromHeader = (headerText: string): string | undefined => {
  if (
    headerText.includes("Base Stats") ||
    headerText.includes("Implicit") ||
    headerText.includes("기본 속성")
  ) {
    return "Base Stats";
  }
  if (
    headerText.includes("Fixed Affix") ||
    headerText.includes("고유 옵션") ||
    headerText.includes("고정")
  ) {
    return "Fixed Affix";
  }
  if (
    headerText.includes("Random Affix") ||
    headerText.includes("랜덤 옵션") ||
    headerText.includes("랜덤")
  ) {
    return "Random Affix";
  }
  return undefined;
};

const extractHeroMemoryData = (html: string): HeroMemory[] => {
  const $ = cheerio.load(html);
  const items: HeroMemory[] = [];

  $(".card").each((_, card) => {
    const $card = $(card);
    let headerText = $card.find(".card-header").first().text().trim();

    if (headerText.includes("기본 속성")) {
      headerText = "Base Stats";
    } else if (headerText.includes("고유 옵션")) {
      headerText = "Fixed Affix";
    } else if (headerText.includes("랜덤 옵션")) {
      headerText = "Random Affix";
    }

    const memoryType = extractTypeFromHeader(headerText);
    console.log("🔍 [Debug] Header:", headerText, "| Type:", memoryType);

    if (memoryType === undefined) {
      return;
    }

    $card.find("table.DataTable").each((_, table) => {
      const $table = $(table);
      const headers = $table.find("thead th");
      if (headers.length !== 5) {
        return;
      }
      console.log("🔍 [Debug] Columns:", headers.length);
      const firstHeader = $(headers[0]).text().trim();
      console.log("🔍 [Debug] First Header:", firstHeader);
      if (firstHeader !== "Tier" && firstHeader !== "티어") {
        return;
      }

      $table.find("tbody tr").each((_, row) => {
        const tds = $(row).find("td");
        if (tds.length !== 5) {
          return;
        }

        const tier = parseInt($(tds[0]).text().trim(), 10);
        const affixHtml = $(tds[1]).html() || "";
        const affix = cleanAffixText(affixHtml);

        // Extract English item name from href
        // e.g. "/ko/Memory_of_Origin" -> "Memory of Origin"
        const itemHref = $(tds[4]).find("a").attr("href") ?? "";
        const itemSlug = itemHref.split("/").pop() ?? "";
        const item = itemSlug.replace(/_/g, " ");

        if (affix.length > 0 && item.length > 0) {
          items.push({ type: memoryType, item, affix, tier });
        }
      });
    });
  });

  return items;
};

const generateDataFile = (items: HeroMemory[]): string => {
  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-hero-memory-data.ts
import type { HeroMemory } from "./types";

export const HeroMemories: readonly HeroMemory[] = ${JSON.stringify(items)};
`;
};

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  if (options.refetch) {
    console.log("Refetching hero memories pages from tlidb...\n");
    await fetchHeroMemoriesPages();
    console.log("");
  }

  console.log("Reading tlidb HTML file...");
  const html = await readFile(TLIDB_HTML_PATH, "utf-8");

  console.log("Extracting hero memory data...");
  const items = extractHeroMemoryData(html);
  console.log(`Extracted ${items.length} hero memories`);

  const byType = items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  const outDir = join(process.cwd(), "src", "data", "hero-memory");
  await mkdir(outDir, { recursive: true });

  const dataPath = join(outDir, "hero-memories.ts");
  await writeFile(dataPath, generateDataFile(items), "utf-8");
  console.log(`Generated hero-memories.ts (${items.length} items)`);

  console.log("\nCode generation complete!");
  execSync("pnpm format", { stdio: "inherit" });
};

program
  .description("Generate hero memory data from cached HTML pages")
  .option("--refetch", "Refetch HTML pages from tlidb before generating")
  .action((options: Options) => {
    main(options)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
      });
  })
  .parse();
