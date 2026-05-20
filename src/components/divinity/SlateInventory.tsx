import type { DivinitySlate } from "@/src/tli/core";
import { SlateInventoryItem } from "./SlateInventoryItem";

interface SlateInventoryProps {
  slates: DivinitySlate[];
  placedSlateIds: string[];
  onPlace: (slateId: string) => void;
  onCopy: (slate: DivinitySlate) => void;
  onDelete: (slateId: string) => void;
}

export const SlateInventory: React.FC<SlateInventoryProps> = ({
  slates,
  placedSlateIds,
  onPlace,
  onCopy,
  onDelete,
}) => {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h3 className="mb-4 text-lg font-medium text-zinc-200">
        Slate Inventory ({slates.length})
      </h3>

      {slates.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No slates crafted yet. Create one above!
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {slates.map((slate) => (
            <SlateInventoryItem
              key={slate.id}
              slate={slate}
              isPlaced={placedSlateIds.includes(slate.id)}
              onPlace={() => onPlace(slate.id)}
              onCopy={() => onCopy(slate)}
              onDelete={() => onDelete(slate.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};


