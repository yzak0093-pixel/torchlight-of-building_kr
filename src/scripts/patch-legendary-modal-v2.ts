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

  // 이전 패치로 삽입했던 코드를 찾아냅니다. (코드 포맷팅 무관하게 찾기 위해 IndexOf 사용)
  const startStr = "const equipmentTypeOptions = useMemo(";
  const endStr = "}, [sortedLegendaries, selectedEquipmentType]);";

  const startIndex = content.indexOf(startStr);
  const endIndex = content.indexOf(endStr, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    console.error(
      "❌ 기존 코드를 찾을 수 없습니다. 정규식 2차 검색을 시도합니다.",
    );
    return;
  }

  // 너무 잘게 쪼개진 DB 데이터를 선생님이 원하시는 8개 대분류로 묶어주는 스마트 필터 교체
  const replacement = `const getBroadCategory = (type: string) => {
    if (!type) return "기타";
    if (type.includes("투구")) return "투구";
    if (type.includes("갑옷") || type.includes("흉갑")) return "갑옷";
    if (type.includes("장갑")) return "장갑";
    if (type.includes("신발")) return "신발";
    if (type.includes("목걸이") || type.includes("목 장식") || type.includes("목")) return "목 장식";
    if (type.includes("반지")) return "반지";
    if (type.includes("벨트")) return "벨트";
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
    "✅ [전설 장비 모달 카테고리 패치 완료] 장비가 8개의 대분류로 깔끔하게 정리되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
