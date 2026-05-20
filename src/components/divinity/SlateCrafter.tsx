import { useState, useMemo } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/src/components/ui/SearchableSelect";
import { MAX_SLATE_AFFIXES } from "@/src/lib/constants";
import {
  type DivinityAffix,
  GOD_BORDER_COLORS,
  GOD_COLORS,
  getDivinityAffixes,
} from "@/src/lib/divinity-utils";
import { generateItemId } from "@/src/lib/storage";
import {
  type Affix,
  DIVINITY_GODS,
  type DivinityGod,
  type DivinitySlate,
  ROTATIONS,
  type Rotation,
  type SlateShape,
} from "@/src/tli/core";

import { SlatePreview } from "./SlatePreview";

const CRAFTABLE_SHAPES: SlateShape[] = ["O", "L", "Z", "T"];

// 1. 신의 이름을 한글로 매핑
const GOD_NAME_KO: Record<DivinityGod, string> = {
  Might: "전신의 신",
  Hunting: "사냥의 여신",
  Knowledge: "지식의 여신",
  Machines: "기계의 신",
  Deception: "기만의 신",
  War: "전쟁의 신",
};

type AffixFilter = "All" | "Medium" | "Legendary";

const createMinimalAffix = (text: string): Affix => ({
  affixLines: text.split(/\n/).map((line) => ({ text: line })),
});

interface SlateCrafterProps {
  onSave: (slate: DivinitySlate) => void;
}

const createEmptySlots = (): (DivinityAffix | undefined)[] =>
  Array(MAX_SLATE_AFFIXES).fill(undefined);

export const SlateCrafter: React.FC<SlateCrafterProps> = ({ onSave }) => {
  const [god, setGod] = useState<DivinityGod>("Hunting");
  const [shape, setShape] = useState<SlateShape>("O");
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flippedH, setFlippedH] = useState(false);
  const [flippedV, setFlippedV] = useState(false);
  const [affixSlots, setAffixSlots] =
    useState<(DivinityAffix | undefined)[]>(createEmptySlots);

  // 2. 현재 선택된 필터 상태 관리
  const [currentFilter, setCurrentFilter] = useState<AffixFilter>("All");

  const allAvailableAffixes = getDivinityAffixes(god);

  // 3. 필터에 따라 드롭다운에 표시할 옵션 필터링
  const filteredAffixes = useMemo(() => {
    return allAvailableAffixes.filter((affix) => {
      if (currentFilter === "All") return true;
      if (currentFilter === "Medium") return affix.type !== "Legendary Medium";
      if (currentFilter === "Legendary")
        return affix.type === "Legendary Medium";
      return true;
    });
  }, [allAvailableAffixes, currentFilter]);

  const getOptionsForSlot = (
    _slotIndex: number,
  ): SearchableSelectOption<string>[] => {
    return filteredAffixes
      .map((affix) => ({
        value: affix.effect,
        label: affix.effect.split("\n").join(" / "),
        sublabel: affix.type === "Legendary Medium" ? "Legendary" : "Medium",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const handleGodChange = (newGod: DivinityGod): void => {
    setGod(newGod);
    setAffixSlots(createEmptySlots());
  };

  const handleRotate = (): void => {
    const currentIndex = ROTATIONS.indexOf(rotation);
    const nextIndex = (currentIndex + 1) % ROTATIONS.length;
    setRotation(ROTATIONS[nextIndex]);
  };

  const handleSlotChange = (
    slotIndex: number,
    effectValue: string | undefined,
  ): void => {
    const newSlots = [...affixSlots];
    newSlots[slotIndex] =
      effectValue !== undefined
        ? allAvailableAffixes.find((a) => a.effect === effectValue)
        : undefined;
    setAffixSlots(newSlots);
  };

  const handleClearSlot = (slotIndex: number): void => {
    const newSlots = [...affixSlots];
    newSlots[slotIndex] = undefined;
    setAffixSlots(newSlots);
  };

  const selectedAffixes = affixSlots.filter(
    (a): a is DivinityAffix => a !== undefined,
  );

  const handleSave = (): void => {
    const slate: DivinitySlate = {
      id: generateItemId(),
      god,
      shape,
      rotation,
      flippedH,
      flippedV,
      affixes: selectedAffixes.map((a) => createMinimalAffix(a.effect)),
    };
    onSave(slate);

    setAffixSlots(createEmptySlots());
    setRotation(0);
    setFlippedH(false);
    setFlippedV(false);
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h3 className="mb-4 text-lg font-medium text-zinc-200">
        석판 제작 (Craft Slate)
      </h3>

      <div className="mb-4">
        <label className="mb-2 block text-sm text-zinc-400">신 (God)</label>
        <div className="flex flex-wrap gap-2">
          {DIVINITY_GODS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => handleGodChange(g)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                god === g
                  ? `${GOD_COLORS[g]} text-white`
                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {GOD_NAME_KO[g] || g}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm text-zinc-400">
          모양 및 방향 (Shape & Orientation)
        </label>
        <div className="flex gap-4 items-start">
          <div className="flex flex-col gap-2">
            {CRAFTABLE_SHAPES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setShape(s)}
                className={`flex h-12 w-12 items-center justify-center rounded border-2 transition-colors ${
                  shape === s
                    ? `${GOD_BORDER_COLORS[god]} ${GOD_COLORS[god]}`
                    : "border-zinc-600 bg-zinc-700 hover:border-zinc-500"
                }`}
              >
                <SlatePreview shape={s} god={god} size="small" />
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded border border-zinc-600 bg-zinc-900">
              <SlatePreview
                shape={shape}
                god={god}
                rotation={rotation}
                flippedH={flippedH}
                flippedV={flippedV}
                size="large"
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleRotate}
                className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
                title="Rotate 90°"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setFlippedH((v) => !v)}
                className={`rounded px-2 py-1 text-xs ${
                  flippedH
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                }`}
                title="Flip Horizontal"
              >
                ↔
              </button>
              <button
                type="button"
                onClick={() => setFlippedV((v) => !v)}
                className={`rounded px-2 py-1 text-xs ${
                  flippedV
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                }`}
                title="Flip Vertical"
              >
                ↕
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm text-zinc-400">
            옵션 (Affixes) ({selectedAffixes.length}/{MAX_SLATE_AFFIXES})
          </label>
          {/* 4. 옵션 티어 필터링 버튼 추가 */}
          <div className="flex gap-1 bg-zinc-900 p-1 rounded">
            {(["All", "Medium", "Legendary"] as AffixFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCurrentFilter(filter)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currentFilter === filter
                    ? "bg-amber-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {filter === "All"
                  ? "전체"
                  : filter === "Medium"
                    ? "일반(Medium)"
                    : "레전더리(Legendary)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {affixSlots.map((affix, slotIndex) => (
            <div key={slotIndex} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-12">
                  Slot {slotIndex + 1}
                </span>
                <div className="flex-1">
                  <SearchableSelect
                    value={affix?.effect}
                    onChange={(value) => handleSlotChange(slotIndex, value)}
                    options={getOptionsForSlot(slotIndex)}
                    placeholder="옵션을 선택하세요 (Select affix...)"
                  />
                </div>
                {affix !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleClearSlot(slotIndex)}
                    className="text-zinc-400 hover:text-red-400 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
              {affix !== undefined && (
                <div className="ml-14 flex items-center gap-2 text-xs text-zinc-400">
                  <span
                    className={`h-2 w-2 rounded-sm ${
                      affix.type === "Legendary Medium"
                        ? "bg-orange-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <span className="truncate">
                    {affix.effect.split("\n")[0]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={selectedAffixes.length === 0}
        className="w-full rounded bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-500 disabled:bg-zinc-600 disabled:cursor-not-allowed"
      >
        인벤토리에 저장 (Save to Inventory)
      </button>
    </div>
  );
};
