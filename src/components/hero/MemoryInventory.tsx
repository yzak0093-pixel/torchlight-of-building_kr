import { useCallback, useMemo, useState } from "react";
import { useHeroUIStore } from "@/src/stores/heroUIStore";
import type { HeroMemory, HeroPage } from "@/src/tli/core";
import { HeroMemoryItem } from "./HeroMemoryItem";

interface MemoryInventoryProps {
  heroPage: HeroPage;
  heroMemoryList: HeroMemory[];
  onMemoryCopy: (memoryId: string) => void;
  onMemoryDelete: (id: string) => void;
}

export const MemoryInventory = ({
  heroPage,
  heroMemoryList,
  onMemoryCopy,
  onMemoryDelete,
}: MemoryInventoryProps) => {
  const openModal = useHeroUIStore((s) => s.openMemoryModal);
  const [selectedMemoryId, setSelectedMemoryId] = useState<
    string | undefined
  >();

  const isMemoryEquipped = (memoryId: string): boolean => {
    return (
      heroPage.memorySlots.slot45?.id === memoryId ||
      heroPage.memorySlots.slot60?.id === memoryId ||
      heroPage.memorySlots.slot75?.id === memoryId
    );
  };

  const handleSelect = useCallback((memoryId: string) => {
    setSelectedMemoryId((prev) => (prev === memoryId ? undefined : memoryId));
  }, []);

  const handleDelete = useCallback(
    (memoryId: string) => {
      onMemoryDelete(memoryId);
      if (selectedMemoryId === memoryId) {
        setSelectedMemoryId(undefined);
      }
    },
    [onMemoryDelete, selectedMemoryId],
  );

  const selectedMemory = useMemo(
    () =>
      selectedMemoryId !== undefined
        ? heroMemoryList.find((m) => m.id === selectedMemoryId)
        : undefined,
    [selectedMemoryId, heroMemoryList],
  );

  const effectiveSelectedId =
    selectedMemory !== undefined ? selectedMemoryId : undefined;

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-zinc-50">
          Memory Inventory ({heroMemoryList.length} items)
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={effectiveSelectedId === undefined}
            onClick={() => {
              if (effectiveSelectedId !== undefined) {
                openModal(effectiveSelectedId);
              }
            }}
            className="rounded bg-zinc-600 px-2 py-1 text-xs text-zinc-50 transition-colors hover:bg-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={effectiveSelectedId === undefined}
            onClick={() => {
              if (effectiveSelectedId !== undefined) {
                onMemoryCopy(effectiveSelectedId);
              }
            }}
            className="rounded bg-amber-500 px-2 py-1 text-xs text-zinc-950 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy
          </button>
          <button
            type="button"
            disabled={effectiveSelectedId === undefined}
            onClick={() => {
              if (effectiveSelectedId !== undefined) {
                handleDelete(effectiveSelectedId);
              }
            }}
            className="rounded bg-red-500 px-2 py-1 text-xs text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
      {heroMemoryList.length === 0 ? (
        <p className="text-zinc-500 italic text-center py-4">
          인벤토리에 기억이 없습니다. "Craft Memory"을 클릭하여 추가하세요.
        </p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {heroMemoryList.map((memory) => (
            <HeroMemoryItem
              key={memory.id}
              memory={memory}
              isEquipped={isMemoryEquipped(memory.id)}
              isSelected={effectiveSelectedId === memory.id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
