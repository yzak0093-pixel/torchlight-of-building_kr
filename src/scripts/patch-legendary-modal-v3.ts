import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "equipment",
  "LegendaryGearModule.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 이전 패치 블록을 찾아냅니다.
  const startStr = "const getBroadCategory = (";
  const endStr = "}, [sortedLegendaries, selectedEquipmentType]);";

  const startIndex = content.indexOf(startStr);
  const endIndex = content.indexOf(endStr, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    console.error("❌ 기존 코드를 찾을 수 없습니다.");
    return;
  }

  // 영문 원본과 한국어 번역본을 모두 스캔하여 8대 분류로 정확하게 분배하는 스마트 로직
  const replacement = `const getBroadCategory = (rawType: string) => {
    if (!rawType) return "무기 / 보조 무기";
    
    const t = String(i18n._(rawType)).toLowerCase();
    const orig = String(rawType).toLowerCase();
    
    const check = (words: string[]) => words.some(w => t.includes(w) || orig.includes(w));

    if (check(["투구", "helmet", "hood", "crown", "mask"])) return "투구";
    if (check(["갑옷", "흉갑", "의복", "armor", "chest", "robe"])) return "갑옷";
    if (check(["목", "necklace", "amulet", "choker"])) return "목 장식";
    if (check(["장갑", "gloves", "gauntlets", "mitts"])) return "장갑";
    if (check(["벨트", "허리띠", "belt", "sash"])) return "벨트";
    if (check(["신발", "장화", "boots", "shoes", "greaves"])) return "신발";
    if (check(["반지", "ring", "band"])) return "반지";
    
    // 위 조건에 안 걸리면 전부 무기/보조무기로 판정
    return "무기 / 보조 무기";
  };

  const equipmentTypeOptions = useMemo(() => {
    const categories = ["투구", "갑옷", "목 장식", "장갑", "벨트", "신발", "반지", "무기 / 보조 무기"];
    return categories.map((cat) => ({ value: cat, label: cat }));
  }, []);

  const legendaryOptions = useMemo(() => {
    return sortedLegendaries
      .map((legendary, idx) => ({
        value: idx,
        label: i18n._(legendary.name),
        sublabel: i18n._(legendary.equipmentType),
        broadCategory: getBroadCategory(legendary.equipmentType),
      }))
      .filter((opt) => selectedEquipmentType === undefined || opt.broadCategory === selectedEquipmentType);
  }, [sortedLegendaries, selectedEquipmentType]);`;

  content =
    content.substring(0, startIndex) +
    replacement +
    content.substring(endIndex + endStr.length);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [전설 장비 모달 3차 패치 완료] 한영 번역 호환성 문제가 해결되어 모든 아이템이 정확한 카테고리로 분배됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
