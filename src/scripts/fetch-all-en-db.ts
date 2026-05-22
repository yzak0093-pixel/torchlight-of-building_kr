/**
 * fetch-all-en-db.ts
 *
 * 모든 카테고리의 영문 DB를 tlidb.com에서 수집하여 .garbage/tlidb-en/ 에 저장합니다.
 *
 * 실행:
 *   pnpm exec tsx src/scripts/fetch-all-en-db.ts
 *   pnpm exec tsx src/scripts/fetch-all-en-db.ts --category gear    # 특정 카테고리만
 *   pnpm exec tsx src/scripts/fetch-all-en-db.ts --dry-run           # URL 목록만 출력
 *
 * 저장 구조 (한글 DB와 동일하게 맞춤):
 *   .garbage/tlidb-en/
 *     gear/          ← tlidb.com/{PageName}
 *     talent/        ← tlidb.com/Talent (단일 페이지)
 *     skill/         ← tlidb.com/{SkillName} (목록에서 링크 수집)
 *     hero-trait/    ← tlidb.com/Hero → 개별 영웅 페이지
 *     hero_memories/ ← tlidb.com/Hero_Memories
 *     pactspirits/   ← tlidb.com/Pactspirit → 개별 팩트스피릿 페이지
 *     core_talent/   ← tlidb.com/Core_Talent (단일 페이지)
 *     legendary_slate/ ← tlidb.com/Legendary_Slate (단일 페이지)
 *     vorax/         ← tlidb.com/Vorax (단일 페이지)
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────

const EN_BASE_URL = "https://tlidb.com"; // 영문 (경로 prefix 없음)
const KO_BASE_URL = "https://tlidb.com/ko"; // 한글 (링크 목록 수집용)

const OUT_ROOT = join(process.cwd(), ".garbage", "tlidb-en");

const CONCURRENCY = 5; // 동시 요청 수 (서버 부하 방지)
const DELAY_MS = 300; // 배치 간 딜레이 (ms)
const RETRY_COUNT = 2; // 실패 시 재시도 횟수

// ─────────────────────────────────────────────
// Gear 페이지 목록 (tlidb-tools.ts와 동일)
// ─────────────────────────────────────────────

const GEAR_PAGES = [
  // One-Handed Weapons
  "Scepter",
  "Wand",
  "Cane",
  "Rod",
  "Cudgel",
  "Dagger",
  "Claw",
  "One-Handed_Axe",
  "One-Handed_Sword",
  "One-Handed_Hammer",
  "Pistol",
  // Two-Handed Weapons
  "Tin_Staff",
  "Bow",
  "Crossbow",
  "Musket",
  "Fire_Cannon",
  "Two-Handed_Axe",
  "Two-Handed_Sword",
  "Two-Handed_Hammer",
  // Armor - STR
  "STR_Chest_Armor",
  "STR_Boots",
  "STR_Gloves",
  "STR_Helmet",
  // Armor - DEX
  "DEX_Chest_Armor",
  "DEX_Boots",
  "DEX_Gloves",
  "DEX_Helmet",
  // Armor - INT
  "INT_Chest_Armor",
  "INT_Boots",
  "INT_Gloves",
  "INT_Helmet",
  // Shields
  "STR_Shield",
  "DEX_Shield",
  "INT_Shield",
  // Accessories
  "Belt",
  "Necklace",
  "Ring",
  "Spirit_Ring",
];

// ─────────────────────────────────────────────
// 스킬 목록 페이지 (generate-skill-data.ts 참조)
// ─────────────────────────────────────────────

// 한글 스킬 목록 페이지에서 링크를 추출하되, 영문 URL로 변환해서 저장
const SKILL_LIST_PATHS = ["Active_Skill", "Support_Skill"];

// ─────────────────────────────────────────────
// 단일 페이지 카테고리
// ─────────────────────────────────────────────

const SINGLE_PAGES: Array<{ category: string; path: string }> = [
  { category: "talent", path: "Talent" },
  { category: "hero_memories", path: "Hero_Memories" },
  // core_talent은 Talent 페이지와 동일 (talent 수집 시 함께 커버됨)
];

// Vorax는 7개의 개별 Limb 페이지로 구성
const VORAX_LIMB_PAGES = [
  "Vorax_Limb%3A_Hands",
  "Vorax_Limb%3A_Legs",
  "Vorax_Limb%3A_Chest",
  "Vorax_Limb%3A_Head",
  "Vorax_Limb%3A_Neck",
  "Vorax_Limb%3A_Waist",
  "Vorax_Limb%3A_Digits",
];

// Legendary Slate는 Divinity_Slate 목록 → 개별 슬레이트 페이지
const DIVINITY_SLATE_LIST_PATH = "Divinity_Slate";

// ─────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────

const toSnakeCase = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchPage = async (
  url: string,
  retries = RETRY_COUNT,
): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          // 브라우저처럼 보이도록 UA 설정 (차단 방지)
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Retry ${attempt + 1}/${retries}: ${url}`);
      await delay(1000 * (attempt + 1));
    }
  }
  throw new Error("unreachable");
};

const runWithConcurrency = async (
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> => {
  const results: Promise<void>[] = [];
  let i = 0;

  const runNext = async (): Promise<void> => {
    while (i < tasks.length) {
      const task = tasks[i++];
      await task();
    }
  };

  for (let w = 0; w < Math.min(limit, tasks.length); w++) {
    results.push(runNext());
  }
  await Promise.all(results);
};

/** 이미 저장된 파일이면 skip (--force 없이는 재수집 안 함) */
const shouldSkip = async (
  filepath: string,
  force: boolean,
): Promise<boolean> => {
  if (force) return false;
  try {
    await stat(filepath);
    return true; // 파일 존재 → skip
  } catch {
    return false;
  }
};

/** HTML에서 특정 패턴의 href 링크 추출 */
const extractLinks = (html: string, pattern: RegExp): string[] => {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1];
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("/")
    ) {
      links.push(href);
    }
  }
  // 중복 제거
  return [...new Set(links)];
};

// ─────────────────────────────────────────────
// 카테고리별 수집 함수
// ─────────────────────────────────────────────

/** Gear: 고정 페이지 목록 직접 수집 */
const fetchGear = async (force: boolean, dryRun: boolean): Promise<void> => {
  const outDir = join(OUT_ROOT, "gear");
  await mkdir(outDir, { recursive: true });
  console.log(`\n📦 [gear] ${GEAR_PAGES.length}개 페이지 수집`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = GEAR_PAGES.map((pageName) => async () => {
    const filename = `${toSnakeCase(pageName)}.html`;
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${encodeURIComponent(pageName)}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      console.log(`  ✅ ${filename}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${pageName}: ${e}`);
    }
    await delay(200);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

/** Talent: 단일 페이지 */
const fetchSinglePage = async (
  category: string,
  path: string,
  force: boolean,
  dryRun: boolean,
): Promise<void> => {
  const outDir = join(OUT_ROOT, category);
  await mkdir(outDir, { recursive: true });
  const url = `${EN_BASE_URL}/${path}`;
  const filepath = join(outDir, `${toSnakeCase(path)}.html`);

  console.log(`\n📄 [${category}] ${url}`);
  if (dryRun) {
    console.log(`  [DRY] ${url}`);
    return;
  }
  if (await shouldSkip(filepath, force)) {
    console.log("  → 스킵 (이미 존재)");
    return;
  }

  try {
    const html = await fetchPage(url);
    await writeFile(filepath, html, "utf-8");
    console.log(`  ✅ ${path}.html`);
  } catch (e) {
    console.error(`  ❌ ${path}: ${e}`);
  }
};

/** Skill: 목록 페이지에서 링크 수집 후 개별 페이지 수집 */
const fetchSkills = async (force: boolean, dryRun: boolean): Promise<void> => {
  const outDir = join(OUT_ROOT, "skill");
  await mkdir(outDir, { recursive: true });
  console.log(`\n🎯 [skill] 목록 페이지에서 링크 수집 중...`);

  // 한글 목록에서 링크 추출 (링크 구조가 동일하므로)
  const allLinks: string[] = [];
  for (const listPath of SKILL_LIST_PATHS) {
    try {
      const listUrl = `${KO_BASE_URL}/${listPath}`;
      console.log(`  목록 수집: ${listUrl}`);
      const html = await fetchPage(listUrl);
      // 스킬 개별 페이지 링크 패턴: href="SkillName" (ItemGold 제외)
      const links = extractLinks(html, /href="([^"]+)"/g).filter(
        (h) => !h.includes("ItemGold") && !h.includes(".") && h.length > 2,
      );
      console.log(`  → ${links.length}개 링크 발견`);
      allLinks.push(...links);
    } catch (e) {
      console.error(`  ❌ 목록 수집 실패 ${listPath}: ${e}`);
    }
  }

  const uniqueLinks = [...new Set(allLinks)];
  console.log(`  총 ${uniqueLinks.length}개 스킬 페이지 수집 예정`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = uniqueLinks.map((link) => async () => {
    const decoded = decodeURIComponent(link);
    const filename = `${toSnakeCase(decoded)}.html`;
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${encodeURIComponent(decoded)}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      if (saved % 20 === 0)
        console.log(`  진행: ${saved}/${uniqueLinks.length}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${decoded}: ${e}`);
    }
    await delay(150);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

/** Hero Trait: 영웅 목록 → 개별 영웅 페이지 */
const fetchHeroTraits = async (
  force: boolean,
  dryRun: boolean,
): Promise<void> => {
  const outDir = join(OUT_ROOT, "hero-trait");
  await mkdir(outDir, { recursive: true });
  console.log(`\n🦸 [hero-trait] 영웅 목록 수집 중...`);

  let listHtml: string;
  try {
    // 영문 Hero 목록 페이지에서 링크 추출
    const listUrl = `${EN_BASE_URL}/Hero`;
    console.log(`  목록: ${listUrl}`);
    listHtml = await fetchPage(listUrl);
  } catch (e) {
    console.error(`  ❌ 영웅 목록 수집 실패: ${e}`);
    return;
  }

  // 영웅 개별 링크 추출 (Hero_XXX 패턴)
  const links = extractLinks(listHtml, /href="([^"#]+)"/g).filter(
    (h) => h.length > 2 && !h.includes("."),
  );
  const uniqueLinks = [...new Set(links)];
  console.log(`  ${uniqueLinks.length}개 영웅 페이지 수집 예정`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = uniqueLinks.map((link) => async () => {
    const decoded = decodeURIComponent(link);
    const filename = `${toSnakeCase(decoded)}.html`;
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${encodeURIComponent(decoded)}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      console.log(`  ✅ ${decoded}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${decoded}: ${e}`);
    }
    await delay(200);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

/** Pactspirit: 팩트스피릿 목록 → 개별 페이지 */
const fetchPactspirits = async (
  force: boolean,
  dryRun: boolean,
): Promise<void> => {
  const outDir = join(OUT_ROOT, "pactspirits");
  await mkdir(outDir, { recursive: true });
  console.log(`\n👻 [pactspirits] 팩트스피릿 목록 수집 중...`);

  let listHtml: string;
  try {
    const listUrl = `${EN_BASE_URL}/Pactspirit`;
    console.log(`  목록: ${listUrl}`);
    listHtml = await fetchPage(listUrl);
  } catch (e) {
    console.error(`  ❌ 팩트스피릿 목록 수집 실패: ${e}`);
    return;
  }

  const links = extractLinks(listHtml, /href="([^"#]+)"/g).filter(
    (h) => h.length > 2 && !h.includes("."),
  );
  const uniqueLinks = [...new Set(links)];
  console.log(`  ${uniqueLinks.length}개 팩트스피릿 페이지 수집 예정`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = uniqueLinks.map((link) => async () => {
    const decoded = decodeURIComponent(link);
    const filename = `${toSnakeCase(decoded)}.html`;
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${encodeURIComponent(decoded)}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      if (saved % 10 === 0)
        console.log(`  진행: ${saved}/${uniqueLinks.length}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${decoded}: ${e}`);
    }
    await delay(150);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

/** Vorax Limb: 7개 고정 페이지 수집 */
const fetchVorax = async (force: boolean, dryRun: boolean): Promise<void> => {
  const outDir = join(OUT_ROOT, "vorax");
  await mkdir(outDir, { recursive: true });
  console.log(`\n🦴 [vorax] ${VORAX_LIMB_PAGES.length}개 Limb 페이지 수집`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = VORAX_LIMB_PAGES.map((pageName) => async () => {
    const decoded = decodeURIComponent(pageName);
    const filename =
      decoded
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") + ".html";
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${pageName}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      console.log(`  ✅ ${decoded}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${decoded}: ${e}`);
    }
    await delay(200);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

/** Legendary Slate: Divinity_Slate 목록 → 개별 슬레이트 페이지 수집 */
const fetchLegendarySlate = async (
  force: boolean,
  dryRun: boolean,
): Promise<void> => {
  const outDir = join(OUT_ROOT, "legendary_slate");
  await mkdir(outDir, { recursive: true });
  console.log(`\n💎 [legendary_slate] Divinity_Slate 목록에서 링크 수집 중...`);

  // 목록 페이지 수집
  const listUrl = `${EN_BASE_URL}/${DIVINITY_SLATE_LIST_PATH}`;
  const listFilepath = join(outDir, "divinity_slate.html");

  let listHtml: string;
  try {
    if (await shouldSkip(listFilepath, force)) {
      const { readFile } = await import("node:fs/promises");
      listHtml = await readFile(listFilepath, "utf-8");
      console.log(`  목록 페이지 캐시 사용`);
    } else {
      console.log(`  목록: ${listUrl}`);
      listHtml = await fetchPage(listUrl);
      await writeFile(listFilepath, listHtml, "utf-8");
    }
  } catch (e) {
    console.error(`  ❌ Divinity_Slate 목록 수집 실패: ${e}`);
    return;
  }

  // 개별 슬레이트 링크 추출
  const links = extractLinks(listHtml, /href="([^"#]+)"/g).filter(
    (h) => h.length > 2 && !h.includes(".") && h !== DIVINITY_SLATE_LIST_PATH,
  );
  const uniqueLinks = [...new Set(links)];
  console.log(`  ${uniqueLinks.length}개 슬레이트 페이지 수집 예정`);

  let saved = 0,
    skipped = 0,
    failed = 0;

  const tasks = uniqueLinks.map((link) => async () => {
    const decoded = decodeURIComponent(link);
    const filename =
      decoded
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") + ".html";
    const filepath = join(outDir, filename);
    const url = `${EN_BASE_URL}/${encodeURIComponent(decoded)}`;

    if (dryRun) {
      console.log(`  [DRY] ${url}`);
      return;
    }
    if (await shouldSkip(filepath, force)) {
      skipped++;
      return;
    }

    try {
      const html = await fetchPage(url);
      await writeFile(filepath, html, "utf-8");
      saved++;
      if (saved % 10 === 0)
        console.log(`  진행: ${saved}/${uniqueLinks.length}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${decoded}: ${e}`);
    }
    await delay(150);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`  → 저장 ${saved}, 스킵 ${skipped}, 실패 ${failed}`);
};

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

const CATEGORIES = [
  "gear",
  "talent",
  "skill",
  "hero-trait",
  "hero_memories",
  "pactspirits",
  "legendary_slate",
  "vorax",
] as const;
type Category = (typeof CATEGORIES)[number];

const main = async () => {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const categoryArg =
    args.find((a) => a.startsWith("--category="))?.split("=")[1] ??
    (args.includes("--category")
      ? args[args.indexOf("--category") + 1]
      : undefined);

  const targetCategories: Category[] = categoryArg
    ? [categoryArg as Category]
    : [...CATEGORIES];

  console.log("=".repeat(60));
  console.log("🌐 tlidb.com 영문 DB 전체 수집 스크립트");
  console.log("=".repeat(60));
  console.log(`대상 카테고리: ${targetCategories.join(", ")}`);
  console.log(`강제 재수집 (--force): ${force}`);
  console.log(`드라이런 (--dry-run): ${dryRun}`);
  console.log(`저장 경로: ${OUT_ROOT}`);
  console.log("=".repeat(60));

  await mkdir(OUT_ROOT, { recursive: true });

  for (const cat of targetCategories) {
    switch (cat) {
      case "gear":
        await fetchGear(force, dryRun);
        break;

      case "skill":
        await fetchSkills(force, dryRun);
        break;

      case "hero-trait":
        await fetchHeroTraits(force, dryRun);
        break;

      case "pactspirits":
        await fetchPactspirits(force, dryRun);
        break;

      case "vorax":
        await fetchVorax(force, dryRun);
        break;

      case "legendary_slate":
        await fetchLegendarySlate(force, dryRun);
        break;

      case "talent":
      case "hero_memories": {
        const info = SINGLE_PAGES.find((p) => p.category === cat);
        if (info)
          await fetchSinglePage(info.category, info.path, force, dryRun);
        break;
      }

      default:
        console.warn(`⚠ 알 수 없는 카테고리: ${cat}`);
    }

    // 카테고리 간 딜레이
    await delay(DELAY_MS);
  }

  // 수집 결과 요약
  console.log("\n" + "=".repeat(60));
  console.log("✅ 수집 완료! 저장된 파일 수:");
  for (const cat of targetCategories) {
    try {
      const dir = join(OUT_ROOT, cat);
      const files = await readdir(dir);
      const htmlCount = files.filter((f) => f.endsWith(".html")).length;
      console.log(`  ${cat.padEnd(20)} ${htmlCount}개`);
    } catch {
      console.log(`  ${cat.padEnd(20)} (디렉토리 없음)`);
    }
  }
  console.log("=".repeat(60));
  console.log(
    "\n다음 단계: pnpm exec tsx src/scripts/build-official-db-map.ts",
  );
};

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
