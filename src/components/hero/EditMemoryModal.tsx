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
  type: "fixed" | "random";
  affixes: string[];
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
        placeholder={`Select ${type === "fixed" ? "Fixed" : "Random"} Affix ${slotIndex + 1}`}
        size="sm"
        className="mb-2"
      />

      {hasSelection && (
        <>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-zinc-500">Quality</label>
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
          Delete
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
        Select a memory type to preview
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
          <div className="text-xs text-zinc-500 mb-0.5">Base Stat</div>
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
  const fixedAffixSlots = useHeroUIStore((s) => s.fixedAffixSlots);
  const randomAffixSlots = useHeroUIStore((s) => s.randomAffixSlots);
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
  const setFixedAffixSlot = useHeroUIStore((s) => s.setFixedAffixSlot);
  const setRandomAffixSlot = useHeroUIStore((s) => s.setRandomAffixSlot);

  const mode = memory === undefined ? "create" : "edit";

  // Get base stat entries for the selected memory type
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

  // Whether we have an existing base stat (edit mode) or need to craft a new one
  const hasExistingBaseStat = existingBaseStat !== undefined;

  // Compute the new crafted base stat string from selections (only used when no existing)
  const craftedBaseStat = useMemo((): string | undefined => {
    if (craftingBaseStatIndex === undefined) return undefined;
    const entry = baseStatEntries[craftingBaseStatIndex];
    if (entry === undefined) return undefined;
    return renderMemoryBaseStat(entry, craftingRarity, craftingLevel);
  }, [baseStatEntries, craftingBaseStatIndex, craftingRarity, craftingLevel]);

  // The effective base stat is either the existing one or the newly crafted one
  const effectiveBaseStat = hasExistingBaseStat
    ? existingBaseStat
    : craftedBaseStat;

  // Initialize state from existing memory when opening in edit mode
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
  ]);

  // Clamp level when rarity changes and current level is no longer available
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

  // Count existing affixes that haven't been deleted
  const activeExistingFixedCount = existingFixedAffixes.filter(
    (a) => a !== "",
  ).length;
  const activeExistingRandomCount = existingRandomAffixes.filter(
    (a) => a !== "",
  ).length;

  // How many new affix slots to show (fill up to max)
  const newFixedSlotCount = Math.max(0, 2 - activeExistingFixedCount);
  const newRandomSlotCount = Math.max(0, 2 - activeExistingRandomCount);

  // Build preview lines from current state
  const previewLines = useMemo((): PreviewLine[] => {
    const lines: PreviewLine[] = [];
    let affixNum = 0;

    // Existing fixed affixes
    for (const text of existingFixedAffixes) {
      if (text !== "") {
        affixNum++;
        lines.push({ label: `Fixed Affix ${affixNum}`, text });
      }
    }

    // New fixed affixes
    for (const slot of fixedAffixSlots.slice(0, newFixedSlotCount)) {
      if (slot.effectIndex !== undefined) {
        affixNum++;
        lines.push({
          label: `Fixed Affix ${affixNum}`,
          text: craftHeroMemoryAffix(
            fixedAffixes[slot.effectIndex],
            slot.quality,
          ),
        });
      }
    }

    affixNum = 0;

    // Existing random affixes
    for (const text of existingRandomAffixes) {
      if (text !== "") {
        affixNum++;
        lines.push({ label: `Random Affix ${affixNum}`, text });
      }
    }

    // New random affixes
    for (const slot of randomAffixSlots.slice(0, newRandomSlotCount)) {
      if (slot.effectIndex !== undefined) {
        affixNum++;
        lines.push({
          label: `Random Affix ${affixNum}`,
          text: craftHeroMemoryAffix(
            randomAffixes[slot.effectIndex],
            slot.quality,
          ),
        });
      }
    }

    return lines;
  }, [
    existingFixedAffixes,
    existingRandomAffixes,
    fixedAffixSlots,
    randomAffixSlots,
    fixedAffixes,
    randomAffixes,
    newFixedSlotCount,
    newRandomSlotCount,
  ]);

  const handleSave = (): void => {
    if (craftingMemoryType === undefined || effectiveBaseStat === undefined)
      return;

    // Collect existing affixes that weren't deleted
    const finalFixedAffixes: string[] = existingFixedAffixes.filter(
      (a) => a !== "",
    );
    const finalRandomAffixes: string[] = existingRandomAffixes.filter(
      (a) => a !== "",
    );

    // Add newly crafted affixes
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

    const savedMemory: HeroMemory = {
      id: memory?.id ?? generateItemId(),
      memoryType: craftingMemoryType,
      baseStat: effectiveBaseStat,
      rarity: craftingRarity,
      level: craftingLevel,
      fixedAffixes: finalFixedAffixes,
      randomAffixes: finalRandomAffixes,
    };

    onSave(memory?.id, savedMemory);
    closeModal();
  };

  const title = mode === "create" ? "Craft Hero Memory" : "Edit Hero Memory";

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={title}
      maxWidth="3xl"
      dismissible={false}
    >
      <div className="flex h-[70vh] gap-4">
        {/* Left panel: Crafting controls */}
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-50">
              Memory Type
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
              placeholder="Select memory type..."
              size="lg"
            />
          </div>

          {craftingMemoryType !== undefined && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-zinc-400">
                    Rarity
                  </label>
                  <SearchableSelect
                    value={craftingRarity}
                    onChange={(value) => {
                      if (value !== undefined) {
                        setCraftingRarity(value as MemoryBaseStatRarity);
                      }
                    }}
                    options={MEMORY_BASE_STAT_RARITIES.map((r) => ({
                      value: r,
                      label:
                        RARITY_KO[r] ?? r.charAt(0).toUpperCase() + r.slice(1),
                    }))}
                    placeholder="Select rarity..."
                    size="sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-zinc-400">
                    Level
                  </label>
                  <SearchableSelect
                    value={craftingLevel}
                    onChange={(value) => {
                      if (value !== undefined) {
                        setCraftingLevel(value);
                      }
                    }}
                    options={availableLevels.map((level) => ({
                      value: level,
                      label: `Level ${level}`,
                    }))}
                    placeholder="Select level..."
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  Base Stat
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
                        placeholder="Select base stat..."
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-zinc-50">
                  Fixed Affixes (2 max)
                </h3>
                <div className="space-y-3">
                  {/* Existing fixed affixes from edit mode */}
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

                  {/* New fixed affix slots */}
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
                  Random Affixes (2 max)
                </h3>
                <div className="space-y-3">
                  {/* Existing random affixes from edit mode */}
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

                  {/* New random affix slots */}
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

        {/* Right panel: Memory preview */}
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
          Cancel
        </ModalButton>
        <ModalButton
          onClick={handleSave}
          fullWidth
          disabled={
            craftingMemoryType === undefined || effectiveBaseStat === undefined
          }
        >
          {mode === "create" ? "Save to Inventory" : "Save"}
        </ModalButton>
      </ModalActions>
    </Modal>
  );
};
