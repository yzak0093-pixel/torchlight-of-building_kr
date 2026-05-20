import { useEffect, useMemo } from "react";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import type { HeroMemory, HeroMemoryType } from "@/src/lib/save-data";
import { HERO_MEMORY_TYPES } from "@/src/lib/save-data";
import { useHeroUIStore } from "@/src/stores/heroUIStore";
import { DEFAULT_QUALITY } from "../../lib/constants";
import type { MemoryBaseStatRarity } from "../../lib/hero-utils";
import {
  craftHeroMemoryAffix,
  getBaseStatsForMemoryType,
  getFixedAffixesForMemoryType,
  getLevelsForRarity,
  getRandomAffixesForMemoryType,
  getRevivalAffixes,
  MEMORY_BASE_STAT_RARITIES,
  renderMemoryBaseStat,
} from "../../lib/hero-utils";
import { generateItemId } from "../../lib/storage";
import { Modal, ModalActions, ModalButton } from "../ui/Modal";

interface EditMemoryModalProps {
  memory: HeroMemory | undefined; // undefined = create mode
  onSave: (memoryId: string | undefined, memory: HeroMemory) => void;
}

interface AffixSlotProps {
  slotIndex: number;
  type: "fixed" | "random" | "revival";
  affixes: readonly string[] | string[];
  effectIndex: number | undefined;
  quality: number;
  onSelect: (effectIndex: number | undefined) => void;
  onQuality: (quality: number) => void;
}

const AffixSlot = ({
  slotIndex,
  type,
  affixes,
  effectIndex,
  quality,
  onSelect,
  onQuality,
}: AffixSlotProps) => {
  const hasSelection = effectIndex !== undefined;

  return (
    <div className="bg-zinc-800 p-3 rounded-lg">
      <SearchableSelect
        value={effectIndex}
        onChange={onSelect}
        options={affixes.map((affix, idx) => {
          const normalized = affix.replace(/\n/g, " ");
          const truncated = normalized.length > 50;
          return {
            value: idx,
            label: truncated ? `${normalized.substring(0, 50)}...` : normalized,
          };
        })}
        placeholder={`${type === "fixed" ? "고정" : type === "random" ? "랜덤" : "재구성"} 옵션 ${slotIndex + 1} 선택`}
        size="sm"
        className="mb-2"
      />

      {hasSelection && (
        <>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-zinc-500">품질</label>
            <span className="text-xs font-medium text-zinc-50">{quality}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={quality}
            onChange={(e) => onQuality(parseInt(e.target.value, 10))}
            className="w-full mb-2"
          />
        </>
      )}
    </div>
  );
};

interface ExistingAffixProps {
  value: string;
  onDelete: () => void;
}

const ExistingAffix = ({
  value,
  onDelete,
}: ExistingAffixProps): React.ReactElement => {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2">
      <div className="flex">
        <div className="flex-1 whitespace-pre-line text-sm font-medium text-amber-400">
          {value}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="ml-2 text-xs font-medium text-red-500 hover:text-red-400"
        >
          삭제
        </button>
      </div>
    </div>
  );
};

interface PreviewLine {
  text: string;
  label: string;
}

const MemoryPreview = ({
  memoryType,
  baseStat,
  previewLines,
}: {
  memoryType: string | undefined;
  baseStat: string | undefined;
  previewLines: PreviewLine[];
}): React.ReactElement => {
  const hasContent =
    memoryType !== undefined ||
    baseStat !== undefined ||
    previewLines.length > 0;

  if (!hasContent) {
    return (
      <p className="text-xs italic text-zinc-500">
        미리볼 추억 종류를 선택하세요
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {memoryType !== undefined && (
        <div className="text-sm font-semibold text-amber-400">
          {MEMORY_TYPE_KO[memoryType] ?? memoryType}
        </div>
      )}

      {baseStat !== undefined && (
        <div className="pt-1 border-t border-zinc-700">
          <div className="text-xs text-zinc-500 mb-0.5">기본 옵션</div>
          <div className="text-xs text-zinc-300 whitespace-pre-wrap">
            {baseStat}
          </div>
        </div>
      )}

      {previewLines.length > 0 && (
        <div className="space-y-1.5">
          {previewLines.map((line, idx) => (
            <div
              key={idx}
              className={
                idx > 0 || baseStat !== undefined
                  ? "pt-1.5 border-t border-zinc-700"
                  : ""
              }
            >
              <div className="text-xs text-zinc-500 mb-0.5">{line.label}</div>
              <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                {line.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MEMORY_TYPE_KO: Record<string, string> = {
  "Memory of Origin": "근원의 추억",
  "Memory of Discipline": "자기 수호의 추억",
  "Memory of Progress": "진격의 추억",
};

const RARITY_KO: Record<string, string> = {
  normal: "일반",
  magic: "매직",
  rare: "레어",
  epic: "에픽",
  ultimate: "얼티밋",
};

export const EditMemoryModal = ({
  memory,
  onSave,
}: EditMemoryModalProps): React.ReactElement => {
  const isOpen = useHeroUIStore((s) => s.isMemoryModalOpen);
  const closeModal = useHeroUIStore((s) => s.closeMemoryModal);
  const craftingMemoryType = useHeroUIStore((s) => s.craftingMemoryType);
  const craftingRarity = useHeroUIStore((s) => s.craftingRarity);
  const craftingLevel = useHeroUIStore((s) => s.craftingLevel);
  const existingBaseStat = useHeroUIStore((s) => s.existingBaseStat);
  const craftingBaseStatIndex = useHeroUIStore((s) => s.craftingBaseStatIndex);

  const existingFixedAffixes = useHeroUIStore((s) => s.existingFixedAffixes);
  const existingRandomAffixes = useHeroUIStore((s) => s.existingRandomAffixes);
  const existingRevivedAffixes = useHeroUIStore(
    (s) => s.existingRevivedAffixes,
  );

  const fixedAffixSlots = useHeroUIStore((s) => s.fixedAffixSlots);
  const randomAffixSlots = useHeroUIStore((s) => s.randomAffixSlots);
  const revivedAffixSlots = useHeroUIStore((s) => s.revivedAffixSlots);

  const setCraftingMemoryType = useHeroUIStore((s) => s.setCraftingMemoryType);
  const setCraftingRarity = useHeroUIStore((s) => s.setCraftingRarity);
  const setCraftingLevel = useHeroUIStore((s) => s.setCraftingLevel);
  const setExistingBaseStat = useHeroUIStore((s) => s.setExistingBaseStat);
  const setCraftingBaseStatIndex = useHeroUIStore(
    (s) => s.setCraftingBaseStatIndex,
  );

  const setExistingFixedAffix = useHeroUIStore((s) => s.setExistingFixedAffix);
  const setExistingRandomAffix = useHeroUIStore(
    (s) => s.setExistingRandomAffix,
  );
  const setExistingRevivedAffix = useHeroUIStore(
    (s) => s.setExistingRevivedAffix,
  );

  const setFixedAffixSlot = useHeroUIStore((s) => s.setFixedAffixSlot);
  const setRandomAffixSlot = useHeroUIStore((s) => s.setRandomAffixSlot);
  const setRevivedAffixSlot = useHeroUIStore((s) => s.setRevivedAffixSlot);

  const mode = memory === undefined ? "create" : "edit";

  const baseStatEntries = useMemo(
    () =>
      craftingMemoryType !== undefined
        ? getBaseStatsForMemoryType(craftingMemoryType)
        : [],
    [craftingMemoryType],
  );

  const availableLevels = useMemo(
    () => getLevelsForRarity(craftingRarity),
    [craftingRarity],
  );

  const hasExistingBaseStat = existingBaseStat !== undefined;

  const craftedBaseStat = useMemo((): string | undefined => {
    if (craftingBaseStatIndex === undefined) return undefined;
    const entry = baseStatEntries[craftingBaseStatIndex];
    if (entry === undefined) return undefined;
    return renderMemoryBaseStat(entry, craftingRarity, craftingLevel);
  }, [baseStatEntries, craftingBaseStatIndex, craftingRarity, craftingLevel]);

  const effectiveBaseStat = hasExistingBaseStat
    ? existingBaseStat
    : craftedBaseStat;

  useEffect(() => {
    if (isOpen && memory !== undefined) {
      setCraftingMemoryType(memory.memoryType);
      setExistingBaseStat(memory.baseStat);
      setCraftingRarity(memory.rarity);
      setCraftingLevel(memory.level);

      for (const [idx, text] of memory.fixedAffixes.entries()) {
        setExistingFixedAffix(idx, text);
      }
      for (const [idx, text] of memory.randomAffixes.entries()) {
        setExistingRandomAffix(idx, text);
      }
      for (const [idx, text] of (memory.revivedAffixes || []).entries()) {
        setExistingRevivedAffix(idx, text);
      }
    }
  }, [
    isOpen,
    memory,
    setCraftingMemoryType,
    setExistingBaseStat,
    setCraftingRarity,
    setCraftingLevel,
    setExistingFixedAffix,
    setExistingRandomAffix,
    setExistingRevivedAffix,
  ]);

  useEffect(() => {
    if (!availableLevels.includes(craftingLevel)) {
      const maxLevel = availableLevels[availableLevels.length - 1];
      if (maxLevel !== undefined) {
        setCraftingLevel(maxLevel);
      }
    }
  }, [availableLevels, craftingLevel, setCraftingLevel]);

  const fixedAffixes = useMemo(
    () =>
      craftingMemoryType !== undefined
        ? getFixedAffixesForMemoryType(craftingMemoryType)
        : [],
    [craftingMemoryType],
  );

  const randomAffixes = useMemo(
    () =>
      craftingMemoryType !== undefined
        ? getRandomAffixesForMemoryType(craftingMemoryType)
        : [],
    [craftingMemoryType],
  );

  const revivalAffixes = useMemo(() => getRevivalAffixes(), []);

  const activeExistingFixedCount = existingFixedAffixes.filter(
    (a) => a !== "",
  ).length;
  const activeExistingRandomCount = existingRandomAffixes.filter(
    (a) => a !== "",
  ).length;
  const activeExistingRevivedCount = existingRevivedAffixes.filter(
    (a) => a !== "",
  ).length;

  const newFixedSlotCount = Math.max(0, 2 - activeExistingFixedCount);
  const newRandomSlotCount = Math.max(0, 2 - activeExistingRandomCount);
  const newRevivedSlotCount = Math.max(0, 1 - activeExistingRevivedCount);

  const previewLines = useMemo((): PreviewLine[] => {
    const lines: PreviewLine[] = [];
    let affixNum = 0;

    // Fixed affixes
    for (const text of existingFixedAffixes) {
      if (text !== "") {
        affixNum++;
        lines.push({ label: `고정 옵션 ${affixNum}`, text });
      }
    }
    for (const slot of fixedAffixSlots.slice(0, newFixedSlotCount)) {
      if (slot.effectIndex !== undefined) {
        affixNum++;
        lines.push({
          label: `고정 옵션 ${affixNum}`,
          text: craftHeroMemoryAffix(
            fixedAffixes[slot.effectIndex],
            slot.quality,
          ),
        });
      }
    }

    // Random affixes
    affixNum = 0;
    for (const text of existingRandomAffixes) {
      if (text !== "") {
        affixNum++;
        lines.push({ label: `랜덤 옵션 ${affixNum}`, text });
      }
    }
    for (const slot of randomAffixSlots.slice(0, newRandomSlotCount)) {
      if (slot.effectIndex !== undefined) {
        affixNum++;
        lines.push({
          label: `랜덤 옵션 ${affixNum}`,
          text: craftHeroMemoryAffix(
            randomAffixes[slot.effectIndex],
            slot.quality,
          ),
        });
      }
    }

    // Revived affixes
    affixNum = 0;
    for (const text of existingRevivedAffixes) {
      if (text !== "") {
        affixNum++;
        lines.push({ label: `재구성 옵션 ${affixNum}`, text });
      }
    }
    for (const slot of revivedAffixSlots.slice(0, newRevivedSlotCount)) {
      if (slot.effectIndex !== undefined) {
        affixNum++;
        lines.push({
          label: `재구성 옵션 ${affixNum}`,
          text: craftHeroMemoryAffix(
            revivalAffixes[slot.effectIndex],
            slot.quality,
          ),
        });
      }
    }

    return lines;
  }, [
    existingFixedAffixes,
    existingRandomAffixes,
    existingRevivedAffixes,
    fixedAffixSlots,
    randomAffixSlots,
    revivedAffixSlots,
    fixedAffixes,
    randomAffixes,
    revivalAffixes,
    newFixedSlotCount,
    newRandomSlotCount,
    newRevivedSlotCount,
  ]);

  const handleSave = (): void => {
    if (craftingMemoryType === undefined || effectiveBaseStat === undefined)
      return;

    const finalFixedAffixes: string[] = existingFixedAffixes.filter(
      (a) => a !== "",
    );
    const finalRandomAffixes: string[] = existingRandomAffixes.filter(
      (a) => a !== "",
    );
    const finalRevivedAffixes: string[] = existingRevivedAffixes.filter(
      (a) => a !== "",
    );

    for (const slot of fixedAffixSlots.slice(0, newFixedSlotCount)) {
      if (slot.effectIndex !== undefined) {
        finalFixedAffixes.push(
          craftHeroMemoryAffix(fixedAffixes[slot.effectIndex], slot.quality),
        );
      }
    }

    for (const slot of randomAffixSlots.slice(0, newRandomSlotCount)) {
      if (slot.effectIndex !== undefined) {
        finalRandomAffixes.push(
          craftHeroMemoryAffix(randomAffixes[slot.effectIndex], slot.quality),
        );
      }
    }

    for (const slot of revivedAffixSlots.slice(0, newRevivedSlotCount)) {
      if (slot.effectIndex !== undefined) {
        finalRevivedAffixes.push(
          craftHeroMemoryAffix(revivalAffixes[slot.effectIndex], slot.quality),
        );
      }
    }

    const savedMemory: HeroMemory = {
      id: memory?.id ?? generateItemId(),
      memoryType: craftingMemoryType,
      baseStat: effectiveBaseStat,
      rarity: craftingRarity,
      level: craftingLevel,
      fixedAffixes: finalFixedAffixes,
      randomAffixes: finalRandomAffixes,
      revivedAffixes: finalRevivedAffixes,
    };

    onSave(memory?.id, savedMemory);
    closeModal();
  };

  const title = mode === "create" ? "추억 제작" : "추억 편집";

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={title}
      maxWidth="3xl"
      dismissible={false}
    >
      <div className="flex h-[70vh] gap-4">
        {/* Left panel */}
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-50">
              추억 종류
            </label>
            <SearchableSelect
              value={craftingMemoryType}
              onChange={(value) =>
                setCraftingMemoryType(value as HeroMemoryType | undefined)
              }
              options={HERO_MEMORY_TYPES.map((type) => ({
                value: type,
                label: MEMORY_TYPE_KO[type] ?? type,
              }))}
              placeholder="추억 종류 선택..."
              size="lg"
            />
          </div>

          {craftingMemoryType !== undefined && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-zinc-400">
                    등급
                  </label>
                  <SearchableSelect
                    value={craftingRarity}
                    onChange={(value) => {
                      if (value !== undefined)
                        setCraftingRarity(value as MemoryBaseStatRarity);
                    }}
                    options={MEMORY_BASE_STAT_RARITIES.map((r) => ({
                      value: r,
                      label:
                        RARITY_KO[r] ?? r.charAt(0).toUpperCase() + r.slice(1),
                    }))}
                    placeholder="등급 선택..."
                    size="sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-zinc-400">
                    레벨
                  </label>
                  <SearchableSelect
                    value={craftingLevel}
                    onChange={(value) => {
                      if (value !== undefined) setCraftingLevel(value);
                    }}
                    options={availableLevels.map((level) => ({
                      value: level,
                      label: `레벨 ${level}`,
                    }))}
                    placeholder="레벨 선택..."
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  기본 옵션
                </h3>
                <div className="space-y-3">
                  {hasExistingBaseStat ? (
                    <ExistingAffix
                      value={existingBaseStat}
                      onDelete={() => setExistingBaseStat(undefined)}
                    />
                  ) : (
                    <div className="bg-zinc-800 p-3 rounded-lg">
                      <SearchableSelect
                        value={craftingBaseStatIndex}
                        onChange={setCraftingBaseStatIndex}
                        options={baseStatEntries.map((entry, idx) => ({
                          value: idx,
                          label: entry.affixTemplate,
                        }))}
                        placeholder="기본 옵션 선택..."
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 신규: 재구성 옵션 (기본 옵션과 고정 옵션 사이) */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  재구성 옵션 (최대 1개)
                </h3>
                <div className="space-y-3">
                  {existingRevivedAffixes.map(
                    (text, idx) =>
                      text !== "" && (
                        <ExistingAffix
                          key={`existing-revival-${idx}`}
                          value={text}
                          onDelete={() =>
                            setExistingRevivedAffix(idx, undefined)
                          }
                        />
                      ),
                  )}
                  {revivedAffixSlots
                    .slice(0, newRevivedSlotCount)
                    .map((slot, idx) => (
                      <AffixSlot
                        key={`revival-${idx}`}
                        slotIndex={idx}
                        type="revival"
                        affixes={revivalAffixes}
                        effectIndex={slot.effectIndex}
                        quality={slot.quality}
                        onSelect={(effectIndex) =>
                          setRevivedAffixSlot(idx, {
                            effectIndex,
                            quality:
                              effectIndex === undefined
                                ? DEFAULT_QUALITY
                                : slot.quality,
                          })
                        }
                        onQuality={(quality) =>
                          setRevivedAffixSlot(idx, { quality })
                        }
                      />
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  고정 옵션 (최대 2개)
                </h3>
                <div className="space-y-3">
                  {existingFixedAffixes.map(
                    (text, idx) =>
                      text !== "" && (
                        <ExistingAffix
                          key={`existing-fixed-${idx}`}
                          value={text}
                          onDelete={() => setExistingFixedAffix(idx, undefined)}
                        />
                      ),
                  )}
                  {fixedAffixSlots
                    .slice(0, newFixedSlotCount)
                    .map((slot, idx) => (
                      <AffixSlot
                        key={`fixed-${idx}`}
                        slotIndex={idx}
                        type="fixed"
                        affixes={fixedAffixes}
                        effectIndex={slot.effectIndex}
                        quality={slot.quality}
                        onSelect={(effectIndex) =>
                          setFixedAffixSlot(idx, {
                            effectIndex,
                            quality:
                              effectIndex === undefined
                                ? DEFAULT_QUALITY
                                : slot.quality,
                          })
                        }
                        onQuality={(quality) =>
                          setFixedAffixSlot(idx, { quality })
                        }
                      />
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  랜덤 옵션 (최대 2개)
                </h3>
                <div className="space-y-3">
                  {existingRandomAffixes.map(
                    (text, idx) =>
                      text !== "" && (
                        <ExistingAffix
                          key={`existing-random-${idx}`}
                          value={text}
                          onDelete={() =>
                            setExistingRandomAffix(idx, undefined)
                          }
                        />
                      ),
                  )}
                  {randomAffixSlots
                    .slice(0, newRandomSlotCount)
                    .map((slot, idx) => (
                      <AffixSlot
                        key={`random-${idx}`}
                        slotIndex={idx}
                        type="random"
                        affixes={randomAffixes}
                        effectIndex={slot.effectIndex}
                        quality={slot.quality}
                        onSelect={(effectIndex) =>
                          setRandomAffixSlot(idx, {
                            effectIndex,
                            quality:
                              effectIndex === undefined
                                ? DEFAULT_QUALITY
                                : slot.quality,
                          })
                        }
                        onQuality={(quality) =>
                          setRandomAffixSlot(idx, { quality })
                        }
                      />
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <MemoryPreview
            memoryType={craftingMemoryType}
            baseStat={effectiveBaseStat}
            previewLines={previewLines}
          />
        </div>
      </div>

      <ModalActions>
        <ModalButton variant="secondary" onClick={closeModal} fullWidth>
          취소
        </ModalButton>
        <ModalButton
          onClick={handleSave}
          fullWidth
          disabled={
            craftingMemoryType === undefined || effectiveBaseStat === undefined
          }
        >
          {mode === "create" ? "인벤토리에 저장" : "저장"}
        </ModalButton>
      </ModalActions>
    </Modal>
  );
};
