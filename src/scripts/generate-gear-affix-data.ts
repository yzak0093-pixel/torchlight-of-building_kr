import { execSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { program } from "commander";
import type {
  AffixType,
  CraftingPool,
  EquipmentSlot,
  EquipmentType,
} from "../tli/gear-data-types";
import {
  EQUIPMENT_TYPE_PAGES,
  fetchGearTypePages,
  GEAR_TYPE_DIR,
  toSnakeCase,
} from "./tlidb-tools";

interface BaseGearAffix {
  equipmentSlot: EquipmentSlot;
  equipmentType: EquipmentType;
  affixType: AffixType;
  craftingPool: CraftingPool;
  tier: string;
  craftableAffix: string;
}

interface BaseGear {
  name: string;
  equipmentSlot: EquipmentSlot;
  equipmentType: EquipmentType;
  stats: string;
}

// Derive filename-keyed map from the shared EQUIPMENT_TYPE_PAGES
const EQUIPMENT_MAP: Record<
  string,
  { type: EquipmentType; slot: EquipmentSlot }
> = Object.fromEntries(
  Object.entries(EQUIPMENT_TYPE_PAGES).map(([pageName, info]) => [
    `${toSnakeCase(pageName)}.html`,
    info,
  ]),
);

// Get section ID prefix from filename (e.g., "scepter.html" -> "Scepter", "str_chest_armor.html" -> "STRChestArmor")
// Note: Some equipment like "one_handed_axe" has section IDs like "#One-HandedAxeBaseAffix" (with hyphen)
const getSectionPrefix = (filename: string): string => {
  const name = filename.replace(".html", "");

  // Special handling for "one_handed" and "two_handed" - they have hyphens in section IDs
  if (name.startsWith("one_handed_") || name.startsWith("two_handed_")) {
    const parts = name.split("_");
    // e.g., ["one", "handed", "axe"] -> "One-HandedAxe"
    const prefix = parts[0].charAt(0).toUpperCase() + parts[0].slice(1); // "One" or "Two"
    const handed = parts[1].charAt(0).toUpperCase() + parts[1].slice(1); // "Handed"
    const weapon = parts
      .slice(2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(""); // "Axe", "Sword", "Hammer"
    return `${prefix}-${handed}${weapon}`;
  }

  // Convert snake_case to PascalCase, uppercase stat prefixes
  return name
    .split("_")
    .map((part) => {
      if (["str", "dex", "int"].includes(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
};

/**
 * Parses modifier text from an element, handling:
 * - <span class="text-mod"> tags (remove, keep inner text with ndash ??hyphen)
 * - <e> hyperlink tags (remove, keep inner text)
 * - <br> tags (convert to newlines)
 * - Various dash characters to regular hyphens
 */
const parseModifierText = (
  // biome-ignore lint/suspicious/noExplicitAny: cheerio internal type
  el: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
): string => {
  const clone = el.clone();

  // Replace <e> hyperlink elements with their text
  clone.find("e").each((_, elem) => {
    $(elem).replaceWith($(elem).text());
  });

  // Remove tooltip icons
  clone.find("i.fa-solid").remove();

  // Replace <br> with placeholder
  let html = clone.html() || "";
  html = html.replace(/<br\s*\/?>/gi, "{NEWLINE}");

  // Parse and extract text
  const processed = cheerio.load(html);
  let text = processed.text();

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/{NEWLINE}\s*/g, "\n");

  // Normalize dashes
  text = text.replace(/\u2013/g, "-"); // en-dash
  text = text.replace(/\u2014/g, "-"); // em-dash
  text = text.replace(/&ndash;/g, "-");

  return text;
};

/**
 * Extract tier from tooltip like: data-bs-title="Tier: 1, Level: 86, Weight: 100"
 */
const extractTierFromTooltip = (
  // biome-ignore lint/suspicious/noExplicitAny: cheerio internal type
  row: cheerio.Cheerio<any>,
): string => {
  const tooltip = row.find('[data-bs-title*="Tier:"]').attr("data-bs-title");
  if (!tooltip) return "";

  const match = tooltip.match(/Tier:\s*(\d+)/);
  return match ? match[1] : "";
};

/**
 * Parse sequences from #Affix section
 * Filters rows where Type column contains "Sequence"
 */
const parseSequences = (
  $: cheerio.CheerioAPI,
  equipmentType: EquipmentType,
  slot: EquipmentSlot,
): BaseGearAffix[] => {
  const affixes: BaseGearAffix[] = [];
  // 한국어 페이지는 #옵션, 영어 페이지는 #Affix
  let table = $("#옵션 table.DataTable");
  if (!table.length) table = $("#Affix table.DataTable");
  if (!table.length) return affixes;

  table.find("tbody tr").each((_, row) => {
    const $row = $(row);
    const tds = $row.find("td");
    if (tds.length < 3) return;

    const typeText = $(tds[2]).text().trim();
    // 영어: "Tower Sequence" / 한국어: "타워 시퀀스" 또는 "타워시퀀스"
    if (!typeText.includes("Sequence") && !typeText.includes("시퀀스")) return;

    const modifier = parseModifierText($(tds[0]), $);
    const tier = extractTierFromTooltip($row);

    affixes.push({
      equipmentSlot: slot,
      equipmentType,
      affixType: "Tower Sequence",
      craftingPool: "",
      tier,
      craftableAffix: modifier,
    });
  });

  return affixes;
};

/**
 * Parse base gear from #Item section
 * Extracts item name and stats from item cards
 */
const parseBaseGear = (
  $: cheerio.CheerioAPI,
  equipmentType: EquipmentType,
  slot: EquipmentSlot,
): BaseGear[] => {
  const items: BaseGear[] = [];
  const section = $("#Item");
  if (!section.length) return items;

  // Find all item cards
  section.find(".col").each((_, col) => {
    const $col = $(col);

    const statsContainer = $col.find(".flex-grow-1");
    if (!statsContainer.length) return;

    // Extract item name from the <a> tag inside .flex-grow-1
    const nameAnchor = statsContainer.children("a").first();
    const name = nameAnchor.text().trim();
    if (!name) return;

    // Extract base stats - look for divs after the "Require lv X" div
    const statsLines: string[] = [];

    statsContainer.children("div").each((_, div) => {
      const $div = $(div);
      const text = $div.text().trim();

      // Skip require level and empty divs
      if (text.startsWith("Require") || !text) return;

      // Check if this is a stats wrapper div (contains child divs with .text-mod spans)
      const childDivs = $div.children("div");
      if (childDivs.length > 0 && $div.find(".text-mod").length > 0) {
        // Extract text from each child div separately to preserve line breaks
        childDivs.each((_, childDiv) => {
          const statText = parseModifierText($(childDiv), $);
          if (statText) {
            statsLines.push(statText);
          }
        });
      } else if ($div.find(".text-mod").length > 0 || /^\+?\d/.test(text)) {
        // Single stat line without nested divs
        const statText = parseModifierText($div, $);
        if (statText) {
          statsLines.push(statText);
        }
      }
    });

    if (statsLines.length > 0) {
      items.push({
        name,
        equipmentSlot: slot,
        equipmentType,
        stats: statsLines.join("\n"),
      });
    }
  });

  return items;
};

/**
 * Parse affixes from a simple table (BaseAffix, CorrosionBase, SweetDreamAffix)
 * Table structure: Tier, Modifier, Level, Weight
 */
const parseSimpleAffixTable = (
  $: cheerio.CheerioAPI,
  rawSectionId: string,
  equipmentType: EquipmentType,
  slot: EquipmentSlot,
  affixType: AffixType,
): BaseGearAffix[] => {
  const affixes: BaseGearAffix[] = [];

  // ── 한국어 페이지 탭 ID 동적 매핑 fallback ──
  let sectionId = rawSectionId;
  let section = $(sectionId);

  if (!section.length) {
    const enKoMap: Record<string, string> = {
      // Accessories
      Belt: "벨트",
      Ring: "반지",
      Necklace: "목걸이",
      SpiritRing: "영혼반지",
      // STR Armor
      STRChestArmor: "힘흉갑",
      STRHelmet: "힘투구",
      STRGloves: "힘글러브",
      STRBoots: "힘신발",
      STRShield: "힘방패",
      // DEX Armor
      DEXChestArmor: "민첩흉갑",
      DEXHelmet: "민첩투구",
      DEXGloves: "민첩장갑",
      DEXBoots: "민첩신발",
      DEXShield: "민첩방패",
      // INT Armor
      INTChestArmor: "지혜흉갑",
      INTHelmet: "지혜투구", // (HTML 기준 지혜투구)
      INTGloves: "지혜장갑",
      INTBoots: "지혜신발",
      INTShield: "지혜방패",
      // One-Handed Weapons
      Scepter: "한손지팡이",
      Wand: "마력지팡이",
      Cane: "마법지팡이",
      Rod: "영혼지팡이",
      Cudgel: "무사의스틱",
      Dagger: "단검",
      Claw: "클로",
      "One-HandedAxe": "한손도끼",
      "One-HandedSword": "한손검",
      "One-HandedHammer": "한손해머",
      Pistol: "권총",
      // Two-Handed Weapons
      TinStaff: "주석지팡이",
      Bow: "활",
      Crossbow: "석궁",
      Musket: "머스킷",
      FireCannon: "화포",
      "Two-HandedAxe": "양손도끼",
      "Two-HandedSword": "양손검",
      "Two-HandedHammer": "양손해머",
    };

    let koSectionId = rawSectionId;
    // 영어 패턴 추출 (예: #BeltBaseAffix -> prefix: "Belt", suffix: "BaseAffix")
    const match = rawSectionId.match(
      /^#([A-Za-z0-9-]+?)(BaseAffix|CorrosionBase|SweetDreamAffix|Craft)$/,
    );
    if (match) {
      const [_, enPrefix, suffix] = match;
      const koPrefix = enKoMap[enPrefix] || enPrefix;

      let koSuffix = "";
      if (suffix === "BaseAffix") koSuffix = "기본옵션";
      else if (suffix === "CorrosionBase") koSuffix = "침식기본";
      else if (suffix === "SweetDreamAffix") koSuffix = "아름다운꿈옵션";
      else if (suffix === "Craft") koSuffix = "제작";

      koSectionId = "#" + koPrefix + koSuffix;
      section = $(koSectionId);
      if (section.length) {
        sectionId = koSectionId;
      }
    }
  }
  // ─────────────────────────────────────────────
  if (!section.length) return affixes;

  const table = section.find("table");
  if (!table.length) return affixes;

  table.find("tbody tr").each((_, row) => {
    const $row = $(row);
    const tds = $row.find("td");
    if (tds.length < 2) return;

    const tier = $(tds[0]).text().trim();
    const modifier = parseModifierText($(tds[1]), $);

    affixes.push({
      equipmentSlot: slot,
      equipmentType,
      affixType,
      craftingPool: "",
      tier,
      craftableAffix: modifier,
    });
  });

  return affixes;
};

/**
 * Map Library column to CraftingPool
 */
const mapLibraryToPool = (library: string): CraftingPool => {
  const lower = library.toLowerCase();
  if (lower.includes("ultimate")) return "Ultimate";
  if (lower.includes("advanced")) return "Advanced";
  if (lower.includes("intermediate")) return "Intermediate";
  if (lower.includes("basic")) return "Basic";
  return "";
};

/**
 * Parse craft affixes from #XXXCraft section
 * Extracts T0 through T4 affixes
 * Table structure: Tier, Modifier, Lv, Weight, Library
 * Two tables: Pre-fix and Suffix (identified by caption)
 */
const parseCraftAffixes = (
  $: cheerio.CheerioAPI,
  sectionId: string,
  equipmentType: EquipmentType,
  slot: EquipmentSlot,
): BaseGearAffix[] => {
  const affixes: BaseGearAffix[] = [];
  // 한국어 페이지 fallback: #BeltCraft -> #벨트제작 등
  let section = $(sectionId);
  if (!section.length) {
    const koMap: Record<string, string> = {
      // Accessories
      Belt: "벨트",
      Ring: "반지",
      Necklace: "목걸이",
      SpiritRing: "영혼반지",
      // STR Armor
      STRChestArmor: "힘흉갑",
      STRHelmet: "힘투구",
      STRGloves: "힘글러브",
      STRBoots: "힘신발",
      STRShield: "힘방패",
      // DEX Armor
      DEXChestArmor: "민첩흉갑",
      DEXHelmet: "민첩투구",
      DEXGloves: "민첩장갑",
      DEXBoots: "민첩신발",
      DEXShield: "민첩방패",
      // INT Armor
      INTChestArmor: "지혜흉갑",
      INTHelmet: "지혜투구", // (HTML 기준 지혜투구)
      INTGloves: "지혜장갑",
      INTBoots: "지혜신발",
      INTShield: "지혜방패",
      // One-Handed Weapons
      Scepter: "한손지팡이",
      Wand: "마력지팡이",
      Cane: "마법지팡이",
      Rod: "영혼지팡이",
      Cudgel: "무사의스틱",
      Dagger: "단검",
      Claw: "클로",
      "One-HandedAxe": "한손도끼",
      "One-HandedSword": "한손검",
      "One-HandedHammer": "한손해머",
      Pistol: "권총",
      // Two-Handed Weapons
      TinStaff: "주석지팡이",
      Bow: "활",
      Crossbow: "석궁",
      Musket: "머스킷",
      FireCannon: "화포",
      "Two-HandedAxe": "양손도끼",
      "Two-HandedSword": "양손검",
      "Two-HandedHammer": "양손해머",
    };
    const m = sectionId.match(/^#([A-Za-z0-9-]+?)Craft$/);
    if (m) {
      const ko = koMap[m[1]] || m[1];
      section = $("#" + ko + "제작");
    }
  }
  // ── 비표준 닫기 태그 대응: cheerio가 </div id="벨트제작"> 같은 태그를
  //    올바르게 파싱하지 못해 section 내부가 비는 경우, tab-pane 전체를 대상으로
  //    caption으로 테이블을 직접 탐색한다.
  const isSectionEmpty = !section.length || section.find("table").length === 0;

  if (isSectionEmpty) {
    // tab-pane div 전체에서 caption이 "메인 옵션" / "서브 옵션"인 테이블 수집
    $("table").each((_, table) => {
      const $table = $(table);
      const caption = $table.find("caption").text().trim();
      const isMain =
        caption.toLowerCase().includes("pre-fix") ||
        caption.includes("메인 옵션");
      const isSub =
        caption.toLowerCase().includes("suffix") ||
        caption.includes("서브 옵션");
      if (!isMain && !isSub) return;

      const affixType: AffixType = isMain ? "Prefix" : "Suffix";

      $table
        .find(
          'tbody tr[data-tier="0"], tbody tr[data-tier="1"], tbody tr[data-tier="2"], tbody tr[data-tier="3"], tbody tr[data-tier="4"]',
        )
        .each((_, row) => {
          const $row = $(row);
          const tds = $row.find("td");
          if (tds.length < 5) return;

          const tier = $(tds[0]).text().trim();
          const modifier = parseModifierText($(tds[1]), $);
          const library = $(tds[4]).text().trim();

          affixes.push({
            equipmentSlot: slot,
            equipmentType,
            affixType,
            craftingPool: mapLibraryToPool(library),
            tier,
            craftableAffix: modifier,
          });
        });
    });
    return affixes;
  }

  if (!section.length) return affixes;

  // Find both tables (Pre-fix / Suffix / 메인 옵션 / 서브 옵션)
  section.find("table").each((_, table) => {
    const $table = $(table);
    const caption = $table.find("caption").text().trim();

    let affixType: AffixType;
    if (
      caption.toLowerCase().includes("pre-fix") ||
      caption.includes("메인 옵션")
    ) {
      affixType = "Prefix";
    } else if (
      caption.toLowerCase().includes("suffix") ||
      caption.includes("서브 옵션")
    ) {
      affixType = "Suffix";
    } else {
      return; // Skip unknown tables
    }

    // Filter for T0 through T4
    $table
      .find(
        'tbody tr[data-tier="0"], tbody tr[data-tier="1"], tbody tr[data-tier="2"], tbody tr[data-tier="3"], tbody tr[data-tier="4"]',
      )
      .each((_, row) => {
        const $row = $(row);
        const tds = $row.find("td");
        if (tds.length < 5) return;

        const tier = $(tds[0]).text().trim();
        const modifier = parseModifierText($(tds[1]), $);
        const library = $(tds[4]).text().trim();

        affixes.push({
          equipmentSlot: slot,
          equipmentType,
          affixType,
          craftingPool: mapLibraryToPool(library),
          tier,
          craftableAffix: modifier,
        });
      });
  });

  return affixes;
};

const normalizeEquipmentType = (type: string): string => {
  return type
    .toLowerCase()
    .replace(/\s*\(([^)]+)\)\s*/g, "-$1")
    .replace(/\s+/g, "-");
};

const normalizeAffixType = (type: string): string => {
  return type.toLowerCase().replace(/\s+/g, "-");
};

const normalizeFileKey = (equipmentType: string, affixType: string): string => {
  return `${normalizeEquipmentType(equipmentType)}-${normalizeAffixType(affixType)}`;
};

const fileKeyToConstName = (fileKey: string): string => {
  return `${fileKey.replace(/-/g, "_").toUpperCase()}_AFFIXES`;
};

const generateEquipmentAffixFile = (
  fileKey: string,
  affixes: BaseGearAffix[],
): string => {
  const constName = fileKeyToConstName(fileKey);

  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-gear-affix-data.ts
import type { BaseGearAffix } from "../../tli/gear-data-types";

export const ${constName}: readonly BaseGearAffix[] = ${JSON.stringify(affixes)};
`;
};

const generateBaseGearFile = (items: BaseGear[]): string => {
  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-gear-affix-data.ts
import type { BaseGear } from "../../tli/gear-data-types";

export const ALL_BASE_GEAR: readonly BaseGear[] = ${JSON.stringify(items)};
`;
};

const generateAllAffixesFile = (fileKeys: string[]): string => {
  const imports = fileKeys
    .map((key) => {
      const constName = fileKeyToConstName(key);
      return `import { ${constName} } from "./${key}";`;
    })
    .join("\n");

  const arraySpread = fileKeys
    .map((key) => `  ...${fileKeyToConstName(key)},`)
    .join("\n");

  return `// This file is machine-generated. Do not modify manually.
// To regenerate, run: pnpm exec tsx src/scripts/generate-gear-affix-data.ts
${imports}

export const ALL_GEAR_AFFIXES = [
${arraySpread}
] as const;
`;
};

interface Options {
  refetch: boolean;
}

const main = async (options: Options): Promise<void> => {
  if (options.refetch) {
    console.log("Refetching gear type pages from tlidb...\n");
    await fetchGearTypePages();
    console.log("");
  }
  const outDir = join(process.cwd(), "src", "data", "gear-affix");

  console.log("Reading gear files from tlidb...");
  const files = await readdir(GEAR_TYPE_DIR);
  const htmlFiles = files.filter(
    (f) => f.endsWith(".html") && f !== "craft.html",
  );

  console.log(`Found ${htmlFiles.length} gear files`);

  const allAffixes: BaseGearAffix[] = [];
  const allBaseGear: BaseGear[] = [];

  for (const file of htmlFiles) {
    const equipmentInfo = EQUIPMENT_MAP[file];
    if (!equipmentInfo) {
      console.warn(`Unknown equipment file: ${file}, skipping`);
      continue;
    }

    const { type, slot } = equipmentInfo;
    const filePath = join(GEAR_TYPE_DIR, file);
    const html = await readFile(filePath, "utf-8");
    const $ = cheerio.load(html);

    const sectionPrefix = getSectionPrefix(file);

    console.log(`Processing ${file} -> ${type} (${sectionPrefix})`);

    // Parse all sections
    const sequences = parseSequences($, type, slot);
    const baseGear = parseBaseGear($, type, slot);
    const baseAffixes = parseSimpleAffixTable(
      $,
      `#${sectionPrefix}BaseAffix`,
      type,
      slot,
      "Base Affix",
    );
    const corrosionBase = parseSimpleAffixTable(
      $,
      `#${sectionPrefix}CorrosionBase`,
      type,
      slot,
      "Corrosion Base",
    );
    const sweetDreamAffixes = parseSimpleAffixTable(
      $,
      `#${sectionPrefix}SweetDreamAffix`,
      type,
      slot,
      "Sweet Dream Affix",
    );
    const craftAffixes = parseCraftAffixes(
      $,
      `#${sectionPrefix}Craft`,
      type,
      slot,
    );

    allAffixes.push(
      ...sequences,
      ...baseAffixes,
      ...corrosionBase,
      ...sweetDreamAffixes,
      ...craftAffixes,
    );

    allBaseGear.push(...baseGear);

    console.log(
      `  Sequences: ${sequences.length}, BaseGear: ${baseGear.length}, BaseAffix: ${baseAffixes.length}, Corrosion: ${corrosionBase.length}, SweetDream: ${sweetDreamAffixes.length}, Craft: ${craftAffixes.length}`,
    );
  }

  console.log(`\nTotal affixes extracted: ${allAffixes.length}`);

  // Group by combination of equipmentType + affixType
  const grouped = new Map<string, BaseGearAffix[]>();

  for (const affix of allAffixes) {
    const fileKey = normalizeFileKey(affix.equipmentType, affix.affixType);

    if (!grouped.has(fileKey)) {
      grouped.set(fileKey, []);
    }
    grouped.get(fileKey)?.push(affix);
  }

  console.log(`Grouped into ${grouped.size} files`);

  // Create output directory
  await mkdir(outDir, { recursive: true });

  // Generate individual affix files
  const fileKeys: string[] = [];

  for (const [fileKey, affixes] of grouped) {
    fileKeys.push(fileKey);
    const fileName = `${fileKey}.ts`;
    const filePath = join(outDir, fileName);
    const content = generateEquipmentAffixFile(fileKey, affixes);

    await writeFile(filePath, content, "utf-8");
    console.log(`Generated ${fileName} (${affixes.length} affixes)`);
  }

  // Generate all-affixes.ts
  const allAffixesPath = join(outDir, "all-affixes.ts");
  const allAffixesContent = generateAllAffixesFile(fileKeys.sort());
  await writeFile(allAffixesPath, allAffixesContent, "utf-8");
  console.log(`Generated all-affixes.ts`);

  // Delete old *-base-stats.ts files from gear-affix/
  const existingFiles = await readdir(outDir);
  const baseStatsFiles = existingFiles.filter((f) =>
    f.endsWith("-base-stats.ts"),
  );
  for (const file of baseStatsFiles) {
    await rm(join(outDir, file));
    console.log(`Deleted old ${file}`);
  }

  // Generate single BaseGear file in src/data/gear-base/
  const baseGearOutDir = join(process.cwd(), "src", "data", "gear-base");
  await mkdir(baseGearOutDir, { recursive: true });

  // Delete old per-type base gear files
  const existingBaseGearFiles = await readdir(baseGearOutDir);
  for (const file of existingBaseGearFiles) {
    if (file !== "all-base-gear.ts" && file.endsWith(".ts")) {
      await rm(join(baseGearOutDir, file));
      console.log(`Deleted old gear-base/${file}`);
    }
  }

  const allBaseGearPath = join(baseGearOutDir, "all-base-gear.ts");
  const allBaseGearContent = generateBaseGearFile(allBaseGear);
  await writeFile(allBaseGearPath, allBaseGearContent, "utf-8");
  console.log(
    `Generated gear-base/all-base-gear.ts (${allBaseGear.length} items)`,
  );

  console.log("\nCode generation complete!");
  console.log(
    `Generated ${grouped.size} affix files with ${allAffixes.length} total affixes`,
  );
  console.log(
    `Generated base gear file with ${allBaseGear.length} total items`,
  );

  execSync("pnpm format", { stdio: "inherit" });
};

program
  .description("Generate gear affix data from cached HTML pages")
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
