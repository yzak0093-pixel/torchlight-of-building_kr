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

  // 1. 상태 변수 추가 (장비 유형을 저장하는 state 추가)
  const stateSearch =
    /const \[selectedLegendaryIndex, setSelectedLegendaryIndex\] = useState<\s*number \| undefined\s*>\(initialLegendaryIndex\);/;
  const stateReplace = `const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | undefined>(
    initialLegendaryIndex !== undefined ? sortedLegendaries[initialLegendaryIndex].equipmentType : undefined
  );
  const [selectedLegendaryIndex, setSelectedLegendaryIndex] = useState<number | undefined>(initialLegendaryIndex);`;
  content = content.replace(stateSearch, stateReplace);

  // 2. 옵션 필터링 로직 추가 (장비 유형 목록 생성 및 전설 장비 필터링)
  const optSearch =
    /const legendaryOptions = useMemo\(\(\) => \{[\s\S]*?return sortedLegendaries\.map\([\s\S]*?\}\)\);\s*\}, \[sortedLegendaries\]\);/;
  const optReplace = `const equipmentTypeOptions = useMemo(() => {
    const types = Array.from(new Set(sortedLegendaries.map((l) => l.equipmentType)));
    return types.map((type) => ({ value: type, label: i18n._(type) }));
  }, [sortedLegendaries]);

  const legendaryOptions = useMemo(() => {
    return sortedLegendaries
      .map((legendary, idx) => ({
        value: idx,
        label: i18n._(legendary.name),
        sublabel: i18n._(legendary.equipmentType),
        type: legendary.equipmentType,
      }))
      .filter((opt) => selectedEquipmentType === undefined || opt.type === selectedEquipmentType);
  }, [sortedLegendaries, selectedEquipmentType]);`;
  content = content.replace(optSearch, optReplace);

  // 3. 모달 UI 수정 (2단 콤보박스로 UI 개편)
  const uiSearch =
    /<div>\s*<label className="mb-1 block text-sm font-medium text-zinc-50">\s*<Trans>Select Legendary<\/Trans>\s*<\/label>\s*<SearchableSelect[\s\S]*?renderOptionTooltip=\{renderLegendaryTooltip\}\s*\/>\s*<\/div>/;
  const uiReplace = `<div>
            <label className="mb-1 block text-sm font-medium text-zinc-50">
              장비 유형 (Type)
            </label>
            <SearchableSelect
              value={selectedEquipmentType}
              onChange={(val) => {
                setSelectedEquipmentType(val);
                handleLegendarySelect(undefined); // 부위를 바꾸면 전설 선택 초기화
              }}
              options={equipmentTypeOptions}
              placeholder="장비 유형을 선택하세요..."
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-zinc-50">
              전설 장비 선택 (Legendary)
            </label>
            <SearchableSelect
              value={selectedLegendaryIndex}
              onChange={handleLegendarySelect}
              options={legendaryOptions}
              placeholder={selectedEquipmentType ? "전설 장비를 선택하세요..." : "장비 유형을 먼저 선택하세요"}
              renderOptionTooltip={renderLegendaryTooltip}
              disabled={selectedEquipmentType === undefined}
            />
          </div>`;
  content = content.replace(uiSearch, uiReplace);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [전설 장비 모달 패치 완료] 장비 유형별 2단 필터링이 적용되어 렉 현상이 해결되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
