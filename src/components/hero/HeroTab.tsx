import { useMemo } from "react";
import type {
  HeroMemorySlot,
  HeroMemory as SaveDataHeroMemory,
} from "@/src/lib/save-data";
import { useHeroUIStore } from "@/src/stores/heroUIStore";
import type { HeroTraitLevel } from "@/src/tli/calcs/offense";
import type { HeroMemory, HeroPage } from "@/src/tli/core";
import { EditMemoryModal } from "./EditMemoryModal";
import { HeroSelector } from "./HeroSelector";
import { MemoryInventory } from "./MemoryInventory";
import { TraitSelector } from "./TraitSelector";

interface HeroTabProps {
  heroPage: HeroPage;
  heroMemoryList: HeroMemory[];
  saveDataMemoryList: SaveDataHeroMemory[];
  heroTraitLevels: HeroTraitLevel[];
  onHeroChange: (hero: string | undefined) => void;
  onTraitSelect: (
    level: 45 | 60 | 75,
    group: "a" | "b",
    traitName: string | undefined,
  ) => void;
  onMemoryEquip: (slot: HeroMemorySlot, memoryId: string | undefined) => void;
  onMemorySave: (
    memoryId: string | undefined,
    memory: SaveDataHeroMemory,
  ) => void;
  onMemoryCopy: (memoryId: string) => void;
  onMemoryDelete: (id: string) => void;
}

const CraftMemoryButton = () => {
  const openModal = useHeroUIStore((s) => s.openMemoryModal);
  return (
    <button
      type="button"
      onClick={() => openModal()}
      className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-600"
    >
      Craft Memory
    </button>
  );
};

export const HeroTab = ({
  heroPage,
  heroMemoryList,
  saveDataMemoryList,
  heroTraitLevels,
  onHeroChange,
  onTraitSelect,
  onMemoryEquip,
  onMemorySave,
  onMemoryCopy,
  onMemoryDelete,
}: HeroTabProps) => {
  const editingMemoryId = useHeroUIStore((s) => s.editingMemoryId);

  // Find the SaveData version of the memory being edited
  const editingMemory = useMemo(
    () =>
      editingMemoryId !== undefined
        ? saveDataMemoryList.find((m) => m.id === editingMemoryId)
        : undefined,
    [editingMemoryId, saveDataMemoryList],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Hero Selection & Traits */}
      <div className="space-y-6">
        <HeroSelector
          selectedHero={heroPage.selectedHero}
          onHeroChange={onHeroChange}
        />
        <TraitSelector
          heroPage={heroPage}
          heroMemoryList={heroMemoryList}
          heroTraitLevels={heroTraitLevels}
          onTraitSelect={onTraitSelect}
          onMemoryEquip={onMemoryEquip}
        />
      </div>

      {/* Right Column: Memory Inventory */}
      <div className="space-y-4">
        <CraftMemoryButton />
        <MemoryInventory
          heroPage={heroPage}
          heroMemoryList={heroMemoryList}
          onMemoryCopy={onMemoryCopy}
          onMemoryDelete={onMemoryDelete}
        />
      </div>

      <EditMemoryModal memory={editingMemory} onSave={onMemorySave} />
    </div>
  );
};


