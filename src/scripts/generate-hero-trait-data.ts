import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import * as cheerio from "cheerio";
import type { BaseHeroTrait } from "../data/hero-trait/types";

const BASE_URL = "https://tlidb.com/ko";
const HERO_LIST_URL = `${BASE_URL}/Hero`;
const HERO_LIST_URL_EN = "https://tlidb.com/en/Hero";
const CACHE_DIR = join(process.cwd(), ".garbage", "tlidb", "hero-trait");
const EXPECTED_TRAIT_COUNT = 25;

// ============================================================================
// Fetching
// ============================================================================

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

interface HeroTraitLink {
  href: string;
  heroClass: string;
  heroName: string;
  traitVariant: string;
}

const extractHeroTraitLinks = (html: string): HeroTraitLink[] => {
  const $ = cheerio.load(html);
  const links: HeroTraitLink[] = [];
  const seen = new Set<string>();

  // Each hero entry is in a div.col with an anchor linking to the trait page
  // The text is like "Berserker Rehan | Anger"
  let tab = $("#히어로");
  if (!tab.length) tab = $("#Hero");
  tab.find("div.col div.flex-grow-1 > a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href === undefined || text.length === 0) return;
    if (seen.has(href)) return;
    seen.add(href);

    // Parse "HeroClass HeroName | TraitVariant" or "HeroClass HeroName|TraitVariant"
    const pipeIndex = text.indexOf("|");
    if (pipeIndex === -1) {
      console.log("🔍 [Debug] No pipe (|) in:", text);
      return;
    }

    const heroFull = text.slice(0, pipeIndex).trim();
    const traitVariant = text.slice(pipeIndex + 1).trim();

    // Split hero into class and name (e.g., "Berserker Rehan" ??"Berserker", "Rehan")
    const spaceIndex = heroFull.indexOf(" ");
    // 한국어 이름 중 공백이 없는 경우를 대비해 스킵 우회
    // if (spaceIndex === -1) return;

    const heroClass = heroFull.slice(0, spaceIndex);
    const heroName = heroFull.slice(spaceIndex + 1);

    links.push({ href, heroClass, heroName, traitVariant });
  });

  console.log("🔍 [Debug] 추출된 히어로 링크 개수:", links.length);
  return links;
};

const runWithConcurrency = async <T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> => {
  const results: T[] = [];
  let index = 0;

  const runNext = async (): Promise<void> => {
    while (index < tasks.length) {
      const currentIndex = index;
      index++;
      const task = tasks[currentIndex];
      if (task !== undefined) {
        results[currentIndex] = await task();
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    runNext,
  );
  await Promise.all(workers);
  return results;
};

const fetchHeroTraitPages = async (): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });

  console.log("Fetching hero list page...");
  const listHtml = await fetchPage(HERO_LIST_URL);
  const links = extractHeroTraitLinks(listHtml);
  console.log(
    `Found ${links.length} hero trait pages (expected: ${EXPECTED_TRAIT_COUNT})`,
  );

  if (links.length !== EXPECTED_TRAIT_COUNT) {
    console.warn(
      `Warning: Count mismatch: found ${links.length}, expected ${EXPECTED_TRAIT_COUNT}`,
    );
  }

  let completed = 0;
  const fetchTasks = links.map((link) => async (): Promise<void> => {
    const decodedHref = decodeURIComponent(link.href);
    const url = `${BASE_URL}/${encodeURIComponent(decodedHref)}`;
    const filepath = join(CACHE_DIR, `${decodedHref}.html`);

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html);
      completed++;
      if (completed % 10 === 0 || completed === links.length) {
        console.log(`Progress: ${completed}/${links.length} pages fetched`);
      }
    } catch (error) {
      console.error(`Error fetching ${decodedHref}:`, error);
    }
  });

  console.log("Fetching with concurrency of 5...");
  await runWithConcurrency(fetchTasks, 5);
  console.log(`Fetched ${completed} hero trait pages`);
};

// ============================================================================
// Parsing
// ============================================================================

const cleanAffixHtml = (html: string): string => {
  const $ = cheerio.load(html, null, false);

  // Replace <e> hyperlink elements with their text content
  $("e").each((_, el) => {
    $(el).replaceWith($(el).text());
  });

  // Replace <span class="text-mod"> with their text content
  $("span.text-mod").each((_, el) => {
    $(el).replaceWith($(el).text());
  });

  // Get cleaned HTML then strip remaining tags
  let text = $.html();

  // Replace <br> tags with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Convert en-dash to hyphen
  text = text.replace(/\u2013/g, "-");

  // Trim each line and remove empty lines
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
};

interface TlidbHeroTraitFile {
  fileName: string;
  html: string;
}

const readCachedHeroTraitFiles = async (): Promise<TlidbHeroTraitFile[]> => {
  const files = await readdir(CACHE_DIR);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  return Promise.all(
    htmlFiles.map(async (fileName) => ({
      fileName: basename(fileName, ".html"),
      html: await readFile(join(CACHE_DIR, fileName), "utf-8"),
    })),
  );
};

const extractTraitsFromPage = (
  html: string,
  heroLabel: string,
): BaseHeroTrait[] => {
  const $ = cheerio.load(html);
  const traits: BaseHeroTrait[] = [];

  // Traits are in div.col > div.d-flex > div.flex-grow-1
  // Each contains: div.fw-bold (name), "Require lv N" text, <hr/>, div (affix HTML)
  const traitContainers = $("div.col div.flex-grow-1.mx-2.my-1");
  console.log("🔍 [Debug] Containers:", traitContainers.length);

  traitContainers.each((_, container) => {
    const nameEl = $(container).find("div.fw-bold").first();
    const name = nameEl.text().trim();
    if (name.length === 0) return;

    // Get the text content after the name div, before the <hr>
    // The "Require lv N" is a text node between the name div and the hr
    const fullText = $(container).text();
    const levelMatch =
      fullText.match(
        /(?:Require lv|레벨 조건|레벨|요구|해제|필요|조건|lv)[^\d]*(\d+)/i,
      ) || fullText.match(/(\d+)/);
    if (levelMatch === null || levelMatch[1] === undefined) return;

    const level = parseInt(levelMatch[1], 10);
    if (Number.isNaN(level)) return;

    // Get all div elements after the first <hr> (each level's content)
    const firstHr = $(container).find("hr").first();
    if (firstHr.length === 0) {
      console.log("🔍 [Debug] No hr for:", name);
      return;
    }

    // Collect all siblings after the first hr
    const affixParts: string[] = [];
    let sibling = firstHr.next();
    while (sibling.length > 0) {
      if (sibling.is("div")) {
        const text = cleanAffixHtml(sibling.html() ?? "");
        if (text.length > 0) affixParts.push(text);
      }
      sibling = sibling.next();
    }

    const affix = affixParts.join("\n---\n");
    if (affix.length === 0) return;

    traits.push({ hero: heroLabel, name, level, affix });
  });

  return traits;
};

// ============================================================================
// Hero label building
// ============================================================================

// Build the hero label in the existing format: "HeroClass HeroName: TraitVariant (#N)"
// href slug (e.g. "Anger") is used as the trait variant for ordering,
// and English hero list page is used to get the correct English labels.
const buildHeroLabels = (
  links: HeroTraitLink[],
  enLinks: HeroTraitLink[],
): Map<string, string> => {
  // 영어 페이지에서 순서 번호(#N)만 가져오기 위해 slug별 카운트 계산
  const enSlugOrder = new Map<string, number>();
  const enHeroVariantCounts = new Map<string, number>();

  for (const link of enLinks) {
    const heroKey = `${link.heroClass} ${link.heroName}`;
    const count = (enHeroVariantCounts.get(heroKey) ?? 0) + 1;
    enHeroVariantCounts.set(heroKey, count);

    const slug = decodeURIComponent(link.href).split("/").pop() ?? link.href;
    enSlugOrder.set(slug, count);
  }

  // 한국어 이름 그대로 사용 + 영어 순서 번호 참조
  const result = new Map<string, string>();
  const koHeroVariantCounts = new Map<string, number>();

  for (const link of links) {
    const decodedHref = decodeURIComponent(link.href);
    const slug = decodedHref.split("/").pop() ?? decodedHref;

    // 한국어 hero 키
    const heroKey = `${link.heroClass} ${link.heroName}`;
    const count = (koHeroVariantCounts.get(heroKey) ?? 0) + 1;
    koHeroVariantCounts.set(heroKey, count);

    // 영어 순서 번호가 있으면 우선 사용, 없으면 한국어 카운트 사용
    const orderNum = enSlugOrder.get(slug) ?? count;

    result.set(decodedHref, `${heroKey}: ${link.traitVariant} (#${orderNum})`);
  }

  return result;
};

// ============================================================================
// Code generation
// ============================================================================

const generateHeroTraitsFile = (traits: BaseHeroTrait[]): string => {
  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-hero-trait-data.ts
import type { BaseHeroTrait } from "./types";

export const HeroTraits = ${JSON.stringify(traits)} as const satisfies readonly BaseHeroTrait[];
`;
};

const main = async (): Promise<void> => {
  const refetch = process.argv.includes("--refetch");

  if (refetch || !existsSync(CACHE_DIR)) {
    console.log("Fetching hero trait pages from tlidb...\n");
    await fetchHeroTraitPages();
    console.log("");
  }

  // Always re-read the list page to get hero labels (needed for ordering/naming)
  console.log("Fetching Korean hero list page...");
  const listHtml = await fetchPage(HERO_LIST_URL);
  const links = extractHeroTraitLinks(listHtml);

  console.log("Fetching English hero list page for English labels...");
  const listHtmlEn = await fetchPage(HERO_LIST_URL_EN);
  const enLinks = extractHeroTraitLinks(listHtmlEn);

  const heroLabels = buildHeroLabels(links, enLinks);

  console.log("Reading cached hero trait HTML files...");
  const files = await readCachedHeroTraitFiles();
  console.log(`Found ${files.length} cached files`);

  console.log("Extracting hero trait data...");
  const allTraits: BaseHeroTrait[] = [];

  // Process in the order from the hero list page to maintain consistent ordering
  for (const link of links) {
    const decodedHref = decodeURIComponent(link.href);
    const file = files.find((f) => f.fileName === decodedHref);
    if (file === undefined) {
      console.warn(`Missing cached file for ${decodedHref}`);
      continue;
    }

    const heroLabel = heroLabels.get(decodedHref);
    if (heroLabel === undefined) {
      console.log("🔍 [Debug] Missing label for:", decodedHref);
      console.warn(`Missing hero label for ${decodedHref}`);
      continue;
    }

    const traits = extractTraitsFromPage(file.html, heroLabel);
    if (traits.length === 0) {
      console.warn(`No traits extracted from ${decodedHref}`);
    }
    allTraits.push(...traits);
  }

  console.log(`Extracted ${allTraits.length} hero traits`);

  if (allTraits.length === 0) {
    throw new Error("No hero traits extracted ??check HTML structure");
  }

  const outDir = join(process.cwd(), "src", "data", "hero-trait");
  await mkdir(outDir, { recursive: true });

  const heroTraitsPath = join(outDir, "hero-traits.ts");
  await writeFile(heroTraitsPath, generateHeroTraitsFile(allTraits), "utf-8");
  console.log(`Generated hero-traits.ts (${allTraits.length} traits)`);

  console.log("\nCode generation complete!");
  execSync("pnpm format", { stdio: "inherit" });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

export { main as generateHeroTraitData };
