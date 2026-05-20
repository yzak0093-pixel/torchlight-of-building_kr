import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";

// ============================================================================
// 설정
// ============================================================================

const BASE_URL = "https://tlidb.com/ko";
const CACHE_DIR = join(process.cwd(), ".garbage", "tlidb", "legendary_slate");
const TEMPLATES_FILE = join(
  process.cwd(),
  "src",
  "lib",
  "legendary-slate-templates.ts",
);

// tlidb URL slug → TOB 내부 key 매핑
// 새 석판이 추가되면 이 맵에 추가하면 됨
const SLATE_URL_TO_KEY: Record<string, string> = {
  Sparks_of_Moth_Fire: "sparks-of-moth-fire",
  When_Sparks_Set_the_Prairie_Ablaze: "sparks-set-prairie",
  A_Corner_of_Divinity: "corner-of-divinity",
  Fallen_Starlight: "fallen-starlight",
  Pedigree_of_Gods: "pedigree-of-gods",
  Space_Rift: "space-rift",
  Residence_of_Stars: "residence-of-stars",
};

// ============================================================================
// fetch
// ============================================================================

const fetchPage = async (url: string): Promise<string> => {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.text();
};

// ============================================================================
// tlidb에서 레전드 석판 링크 목록 추출
// ============================================================================

const fetchLegendarySlateLinks = async (): Promise<string[]> => {
  const html = await fetchPage(`${BASE_URL}/Divinity_Slate`);
  const $ = cheerio.load(html);

  // 레전드 장비 탭 찾기 (탭 ID 자동 감지)
  let tabId = "";
  $("[data-bs-target]").each((_, el) => {
    const target = $(el).attr("data-bs-target") ?? "";
    const text = $(el).text().trim();
    if (text.includes("레전드") && text.includes("장비")) {
      tabId = target.replace("#", "");
    }
  });

  if (!tabId) {
    console.warn(
      "⚠️  레전드 장비 탭을 찾지 못했습니다. 전체 페이지에서 탐색합니다.",
    );
  }

  const section = tabId ? $(`#${tabId}`) : $("body");
  const links: string[] = [];

  section.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // 레전드 석판 링크만 추출 (tlidb 상대 경로)
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("/")
    ) {
      const decoded = decodeURIComponent(href);
      if (SLATE_URL_TO_KEY[decoded] !== undefined) {
        if (!links.includes(decoded)) links.push(decoded);
      }
    }
  });

  // 매핑된 전체 목록도 포함 (페이지에서 못 찾은 경우 대비)
  for (const slug of Object.keys(SLATE_URL_TO_KEY)) {
    if (!links.includes(slug)) {
      links.push(slug);
    }
  }

  console.log(`레전드 석판 ${links.length}개 발견: ${links.join(", ")}`);
  return links;
};

// ============================================================================
// 개별 석판 페이지 파싱
// ============================================================================

interface ParsedSlateInfo {
  slug: string;
  displayName: string;
  fixedAffixes: { text: string; direction?: string }[];
  affixSlotLabels: string[]; // <하위 재능>, <중위 재능> 등
  description: string;
}

const DIRECTION_KEYWORDS: Record<string, string> = {
  위쪽: "up",
  왼쪽: "left",
  아래쪽: "down",
  오른쪽: "right",
  above: "up",
  left: "left",
  below: "down",
  right: "right",
};

const detectDirection = (text: string): string | undefined => {
  for (const [keyword, dir] of Object.entries(DIRECTION_KEYWORDS)) {
    if (text.includes(keyword)) return dir;
  }
  return undefined;
};

const parseSlateAffix = (
  text: string,
): { text: string; direction?: string } => {
  const direction = detectDirection(text);
  return direction ? { text, direction } : { text };
};

const parseSlateInfo = (slug: string, html: string): ParsedSlateInfo => {
  const $ = cheerio.load(html);

  // 현재 시즌 카드 찾기 (첫 번째 카드)
  const card = $("div.card").first();

  // displayName: h5.card-title 또는 og:title
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const cardTitle = card.find("h5.card-title, .fw-bold").first().text().trim();
  const displayName = ogTitle || cardTitle || slug.replace(/_/g, " ");

  // fixedAffixes 및 affixSlots 파싱
  const fixedAffixes: { text: string; direction?: string }[] = [];
  const affixSlotLabels: string[] = [];

  card.find("div.explicitMod, .modifier, p").each((_, el) => {
    $(el).find("small.description").remove();
    let text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;

    // <하위 재능>, <중위 재능> 등 슬롯 레이블
    if (text.startsWith("<") && text.endsWith(">")) {
      affixSlotLabels.push(text.slice(1, -1));
      return;
    }

    // 복제 관련 텍스트 → fixedAffixes
    if (
      text.includes("복제") ||
      text.includes("복사") ||
      text.includes("Copies") ||
      text.includes("Replicates")
    ) {
      fixedAffixes.push(parseSlateAffix(text));
    }
  });

  // description: 석판 설명 (간단한 요약)
  // tlidb 페이지의 flavor text나 첫 번째 설명 텍스트 사용
  const descEl = card.find("p, .card-text").last();
  const rawDesc = descEl.text().replace(/\s+/g, " ").trim();
  const description = rawDesc.length > 0 && rawDesc.length < 100 ? rawDesc : "";

  return { slug, displayName, fixedAffixes, affixSlotLabels, description };
};

// ============================================================================
// legendary-slate-templates.ts 업데이트
// ============================================================================

const updateTemplatesFile = async (
  parsedSlates: ParsedSlateInfo[],
): Promise<void> => {
  let content = await readFile(TEMPLATES_FILE, "utf-8");
  let updatedCount = 0;

  for (const slate of parsedSlates) {
    const key = SLATE_URL_TO_KEY[slate.slug];
    if (!key) continue;

    // displayName 업데이트
    const oldDisplayName = content.match(
      new RegExp(`(key:\\s*"${key}"[\\s\\S]*?displayName:\\s*)"([^"]+)"`),
    );
    if (oldDisplayName && oldDisplayName[2] !== slate.displayName) {
      content = content.replace(
        `${oldDisplayName[1]}"${oldDisplayName[2]}"`,
        `${oldDisplayName[1]}"${slate.displayName}"`,
      );
      console.log(
        `  🔄 ${key} displayName: "${oldDisplayName[2]}" → "${slate.displayName}"`,
      );
      updatedCount++;
    }

    // description 업데이트 (있는 경우만)
    if (slate.description) {
      const oldDesc = content.match(
        new RegExp(`(key:\\s*"${key}"[\\s\\S]*?description:\\s*)"([^"]+)"`),
      );
      if (oldDesc && oldDesc[2] !== slate.description) {
        content = content.replace(
          `${oldDesc[1]}"${oldDesc[2]}"`,
          `${oldDesc[1]}"${slate.description}"`,
        );
        console.log(`  🔄 ${key} description 업데이트`);
        updatedCount++;
      }
    }

    // fixedAffixes 업데이트 (있는 경우만)
    if (slate.fixedAffixes.length > 0) {
      const affixJson = JSON.stringify(slate.fixedAffixes, null, 8)
        .replace(/^/gm, "      ")
        .trim();

      // fixedAffixes 블록 찾아서 교체
      const fixedAffixRegex = new RegExp(
        `(key:\\s*"${key}"[\\s\\S]*?fixedAffixes:\\s*)\\[[\\s\\S]*?\\]`,
      );
      if (fixedAffixRegex.test(content)) {
        content = content.replace(fixedAffixRegex, `$1${affixJson}`);
        console.log(
          `  🔄 ${key} fixedAffixes 업데이트 (${slate.fixedAffixes.length}개)`,
        );
        updatedCount++;
      }
    }
  }

  await writeFile(TEMPLATES_FILE, content, "utf-8");
  console.log(`\n💾 저장 완료! ${updatedCount}개 항목 업데이트`);
};

// ============================================================================
// 신규 석판 추가 (TOB에 없는 경우 경고)
// ============================================================================

const checkNewSlates = (
  parsedSlates: ParsedSlateInfo[],
  content: string,
): void => {
  for (const slate of parsedSlates) {
    const key = SLATE_URL_TO_KEY[slate.slug];
    if (!key) continue;
    if (!content.includes(`key: "${key}"`)) {
      console.warn(
        `\n⚠️  신규 석판 발견: "${slate.displayName}" (key: "${key}")`,
      );
      console.warn(`   TOB에 아직 추가되지 않았습니다.`);
      console.warn(
        `   legendary-slate-templates.ts에 수동으로 추가해야 합니다.`,
      );
      console.warn(
        `   shape, canRotate, canFlip, affixSlots 정보가 필요합니다.\n`,
      );
    }
  }
};

// ============================================================================
// Main
// ============================================================================

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });

  // 1. 레전드 석판 목록 가져오기
  const slugs = await fetchLegendarySlateLinks();

  // 2. 각 페이지 fetch 및 파싱
  const parsedSlates: ParsedSlateInfo[] = [];

  for (const slug of slugs) {
    const cachePath = join(CACHE_DIR, `${slug}.html`);

    let html: string;
    if (!options.refetch) {
      try {
        html = await readFile(cachePath, "utf-8");
        console.log(`캐시 사용: ${slug}`);
      } catch {
        html = await fetchPage(`${BASE_URL}/${encodeURIComponent(slug)}`);
        await writeFile(cachePath, html, "utf-8");
      }
    } else {
      html = await fetchPage(`${BASE_URL}/${encodeURIComponent(slug)}`);
      await writeFile(cachePath, html, "utf-8");
    }

    const parsed = parseSlateInfo(slug, html);
    console.log(`  파싱 완료: ${parsed.displayName}`);
    parsedSlates.push(parsed);
  }

  // 3. 신규 석판 확인
  const currentContent = await readFile(TEMPLATES_FILE, "utf-8");
  checkNewSlates(parsedSlates, currentContent);

  // 4. 기존 템플릿 업데이트
  console.log("\nlegendary-slate-templates.ts 업데이트 중...");
  await updateTemplatesFile(parsedSlates);

  console.log("\nCode generation complete!");
  execSync("pnpm format", { stdio: "inherit" });
};

program
  .description("Update legendary slate templates from tlidb")
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
