import { Trans } from "@lingui/react/macro";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { i18n } from "@/src/lib/i18n";
import {
  type CraftedInverseImage,
  type CraftedPrism,
  toSaveDataPrism,
} from "@/src/tli/core";
import {
  canPlaceInverseImage,
  canRemoveInverseImage,
  canRemovePrism,
  GOD_GODDESS_TREES,
  isGodGoddessTree,
  PROFESSION_TREES,
} from "@/src/tli/talent-tree";
import { InverseImageSection } from "../../../components/talents/InverseImageSection";
import { PrismCoreTalentEffect } from "../../../components/talents/PrismCoreTalentEffect";
import { PrismSection } from "../../../components/talents/PrismSection";
import { TalentGrid } from "../../../components/talents/TalentGrid";
import {
  getAvailableGodGoddessCoreTalents,
  getAvailableProfessionCoreTalents,
} from "../../../lib/core-talent-utils";
import {
  paramToTreeSlot,
  TALENT_SLOT_PARAMS,
  type TalentSlotParam,
  type TreeSlot,
  treeSlotToParam,
} from "../../../lib/types";
import {
  useBuilderActions,
  useConfiguration,
  useLoadout,
  useTalentTree,
} from "../../../stores/builderStore";
import { useTalentsUIStore } from "../../../stores/talentsUIStore";

const TREE_KO: Record<string, string> = {
  "Goddess of Deception": "기만의 여신",
  "God of War": "전신",
  "Goddess of Hunting": "사냥의 여신",
  "Goddess of Knowledge": "지식의 여신",
  "God of Machines": "기계의 신",
  "God of Might": "거력의 신",
  Bladerunner: "블레이드 러너",
  Druid: "드루이드",
  Marksman: "명사수",
  Assassin: "어쌔신",
  Lich: "리치",
  Warlock: "워락",
  Arcanist: "아카니스트",
  Elementalist: "엘리멘탈리스트",
  Magister: "매지스터",
  Prophet: "사이킥",
  Alchemist: "알케미스트",
  Artisan: "아티잔",
  Machinist: "머시니스트",
  "Steel Vanguard": "스틸 뱅가드",
  Onslaughter: "슬로터",
  "The Brave": "용자",
  Warlord: "워로드",
  Warrior: "워리어",
  Ranger: "레인저",
  Ronin: "로닌",
  Sentinel: "센티넬",
  Shadowdancer: "섀도우 댄서",
};
const tKo = (name: string) => TREE_KO[name] || name;

export const Route = createFileRoute("/builder/talents/$slot")({
  component: TalentsSlotPage,
  beforeLoad: ({ params, search }) => {
    if (
      !TALENT_SLOT_PARAMS.includes(
        params.slot as (typeof TALENT_SLOT_PARAMS)[number],
      )
    ) {
      throw redirect({
        to: "/builder/talents/$slot",
        params: { slot: "slot_1" },
        search,
      });
    }
  },
});

function TalentsSlotPage(): React.ReactNode {
  const { slot } = Route.useParams();
  const activeTreeSlot = paramToTreeSlot(slot as TalentSlotParam);

  // Router state for search params
  const routerState = useRouterState();
  const currentSearch = routerState.location.search as { id?: string };
  const navigate = useNavigate();

  // Builder store - actions and loadout
  const loadout = useLoadout();
  const {
    setTreeOrClear,
    resetTree,
    allocateNode,
    deallocateNode,
    selectCoreTalent,
    addPrismToInventory,
    updatePrism,
    copyPrism,
    deletePrism,
    placePrism,
    returnPrismToInventory,
    addInverseImageToInventory,
    updateInverseImage,
    copyInverseImage,
    deleteInverseImage,
    placeInverseImage,
    removePlacedInverseImage,
    allocateReflectedNode,
    deallocateReflectedNode,
  } = useBuilderActions();

  // Talents UI store
  const selectedPrismId = useTalentsUIStore((state) => state.selectedPrismId);
  const setSelectedPrismId = useTalentsUIStore(
    (state) => state.setSelectedPrismId,
  );
  const selectedInverseImageId = useTalentsUIStore(
    (state) => state.selectedInverseImageId,
  );
  const setSelectedInverseImageId = useTalentsUIStore(
    (state) => state.setSelectedInverseImageId,
  );

  // Get the current talent tree from loadout
  const currentTalentTree = useTalentTree(activeTreeSlot);

  // Get configuration for total available points
  const configuration = useConfiguration();

  // Derived values from loadout
  const placedPrism = loadout.talentPage.talentTrees.placedPrism;
  const placedInverseImage = loadout.talentPage.talentTrees.placedInverseImage;
  const prismList = loadout.talentPage.inventory.prismList;
  const inverseImageList = loadout.talentPage.inventory.inverseImageList;

  const handleTreeChange = useCallback(
    (treeSlot: TreeSlot, newTreeName: string) => {
      const tree = loadout.talentPage.talentTrees[treeSlot];
      if (tree?.nodes.some((n) => n.points > 0)) return;

      // Don't allow switching if there's a prism placed in this tree
      if (placedPrism?.treeSlot === treeSlot) return;

      if (newTreeName === "") {
        setTreeOrClear(treeSlot, "");
        return;
      }

      if (treeSlot !== "tree1" && isGodGoddessTree(newTreeName)) return;
      if (treeSlot === "tree1" && !isGodGoddessTree(newTreeName)) return;

      setTreeOrClear(treeSlot, newTreeName);
    },
    [loadout.talentPage.talentTrees, setTreeOrClear, placedPrism],
  );

  const handleResetTree = useCallback(
    (treeSlot: TreeSlot) => {
      const tree = loadout.talentPage.talentTrees[treeSlot];
      if (!tree || !tree.nodes.some((n) => n.points > 0)) return;
      if (
        confirm(
          "이 트리에 투자한 모든 포인트를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        )
      ) {
        resetTree(treeSlot);
      }
    },
    [loadout.talentPage.talentTrees, resetTree],
  );

  const handleAllocate = useCallback(
    (treeSlot: TreeSlot, x: number, y: number) => {
      // Find node max points from the current talent tree
      const nodeData = currentTalentTree?.nodes.find(
        (n) => n.x === x && n.y === y && !n.isReflected,
      );
      if (!nodeData) return;
      allocateNode(treeSlot, x, y, nodeData.maxPoints);
    },
    [currentTalentTree, allocateNode],
  );

  const handleDeletePrism = useCallback(
    (prismId: string) => {
      deletePrism(prismId);
      if (selectedPrismId === prismId) {
        setSelectedPrismId(undefined);
      }
    },
    [deletePrism, selectedPrismId, setSelectedPrismId],
  );

  const handlePlacePrism = useCallback(
    (treeSlot: TreeSlot, x: number, y: number) => {
      if (!selectedPrismId) return;

      // Only allow prisms on profession trees (slots 2-4), not god/goddess tree (slot 1)
      if (treeSlot === "tree1") return;

      const prism = prismList.find((p) => p.id === selectedPrismId);
      if (!prism) return;

      // Only allow one prism at a time
      if (placedPrism) return;

      // Cannot place prism in same tree as inverse image
      if (placedInverseImage && placedInverseImage.treeSlot === treeSlot)
        return;

      // Verify node has 0 points allocated
      const tree = loadout.talentPage.talentTrees[treeSlot];
      if (!tree) return;
      const node = tree.nodes.find((n) => n.x === x && n.y === y);
      if (node && node.points > 0) return;

      // Check if this prism replaces core talents
      const replacesCoreTalent = prism.baseAffix.startsWith(
        "Replaces the Core Talent",
      );

      // Place the prism (action removes from inventory and places)
      placePrism(toSaveDataPrism(prism), treeSlot, { x, y });

      // If prism replaces core talents, clear them
      if (replacesCoreTalent) {
        // Reset tree with same name but clear core talents
        const treeName = tree.name;
        setTreeOrClear(treeSlot, treeName, true);
      }

      // Clear selection after placing
      setSelectedPrismId(undefined);
    },
    [
      selectedPrismId,
      prismList,
      placedPrism,
      placedInverseImage,
      loadout.talentPage.talentTrees,
      placePrism,
      setTreeOrClear,
      setSelectedPrismId,
    ],
  );

  const handleRemovePrism = useCallback(() => {
    if (!placedPrism || !currentTalentTree) return;

    if (!canRemovePrism(placedPrism, currentTalentTree.nodes)) {
      return;
    }

    returnPrismToInventory();
  }, [placedPrism, currentTalentTree, returnPrismToInventory]);

  const handleDeleteInverseImage = useCallback(
    (inverseImageId: string) => {
      deleteInverseImage(inverseImageId);
      if (selectedInverseImageId === inverseImageId) {
        setSelectedInverseImageId(undefined);
      }
    },
    [deleteInverseImage, selectedInverseImageId, setSelectedInverseImageId],
  );

  const handlePlaceInverseImage = useCallback(
    (treeSlot: TreeSlot, x: number, y: number) => {
      if (!selectedInverseImageId || !currentTalentTree) return;

      // Only allow inverse images on profession trees (slots 2-4)
      if (treeSlot === "tree1") return;

      const inverseImage = inverseImageList.find(
        (ii) => ii.id === selectedInverseImageId,
      );
      if (!inverseImage) return;

      const result = canPlaceInverseImage(
        x,
        treeSlot as "tree2" | "tree3" | "tree4",
        currentTalentTree.nodes,
        placedPrism,
        placedInverseImage,
      );

      if (!result.canPlace) {
        return;
      }

      placeInverseImage(inverseImage, treeSlot as "tree2" | "tree3" | "tree4", {
        x,
        y,
      });

      setSelectedInverseImageId(undefined);
    },
    [
      selectedInverseImageId,
      currentTalentTree,
      inverseImageList,
      placedPrism,
      placedInverseImage,
      placeInverseImage,
      setSelectedInverseImageId,
    ],
  );

  const handleRemoveInverseImage = useCallback(() => {
    if (!currentTalentTree || !placedInverseImage) return;

    if (!canRemoveInverseImage(currentTalentTree.nodes)) {
      return;
    }

    removePlacedInverseImage();
  }, [currentTalentTree, placedInverseImage, removePlacedInverseImage]);

  const currentTreeTotalPoints = currentTalentTree
    ? currentTalentTree.nodes.reduce((sum, node) => sum + node.points, 0)
    : 0;

  // Calculate total points used across all trees
  const totalPointsUsed = (
    ["tree1", "tree2", "tree3", "tree4"] as const
  ).reduce((sum, treeSlot) => {
    const tree = loadout.talentPage.talentTrees[treeSlot];
    return sum + (tree ? tree.nodes.reduce((s, n) => s + n.points, 0) : 0);
  }, 0);
  const totalPointsAvailable = configuration.level + 13;
  const isOverAllocated = totalPointsUsed > totalPointsAvailable;

  // Core talent data for dropdowns
  const coreTalentSlots = (() => {
    if (!currentTalentTree) return [];
    if (currentTalentTree.replacementPrismCoreTalent !== undefined) return [];

    const isGodTree = isGodGoddessTree(currentTalentTree.name);
    const selectedCoreTalents = currentTalentTree.selectedCoreTalentNames ?? [];

    if (isGodTree) {
      const { firstSlot, secondSlot } = getAvailableGodGoddessCoreTalents(
        currentTalentTree.name,
        selectedCoreTalents,
      );
      return [
        {
          index: 0,
          label: "Core Talent 1",
          available: firstSlot,
          selected: selectedCoreTalents[0],
        },
        {
          index: 1,
          label: "Core Talent 2",
          available: secondSlot,
          selected: selectedCoreTalents[1],
        },
      ];
    }

    const available = getAvailableProfessionCoreTalents(
      currentTalentTree.name,
      selectedCoreTalents,
    );
    return [
      {
        index: 0,
        label: "Core Talent",
        available,
        selected: selectedCoreTalents[0],
      },
    ];
  })();

  return (
    <>
      <div>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          {/* Tree slot selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">
              트리 슬롯{" "}
              <span
                className={isOverAllocated ? "text-red-500" : "text-zinc-500"}
              >
                ({totalPointsUsed}/{totalPointsAvailable})
              </span>
            </label>
            <select
              value={treeSlotToParam(activeTreeSlot)}
              onChange={(e) => {
                const newSlot = e.target.value as TalentSlotParam;
                navigate({
                  to: "/builder/talents/$slot",
                  params: { slot: newSlot },
                  search: { id: currentSearch.id },
                });
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50"
            >
              {(["tree1", "tree2", "tree3", "tree4"] as const).map(
                (treeSlot) => {
                  const tree = loadout.talentPage.talentTrees[treeSlot];
                  const totalPoints = tree
                    ? tree.nodes.reduce((sum, node) => sum + node.points, 0)
                    : 0;
                  const treeName = tree
                    ? i18n._(tree.name.replace(/_/g, " "))
                    : "None";
                  const slotLabel =
                    treeSlot === "tree1"
                      ? "슬롯 1"
                      : `슬롯 ${treeSlot.slice(-1)}`;
                  return (
                    <option key={treeSlot} value={treeSlotToParam(treeSlot)}>
                      {slotLabel}: {treeName} ({totalPoints} pts)
                    </option>
                  );
                },
              )}
            </select>
          </div>

          {/* Tree selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">트리</label>
            <div className="flex gap-2">
              <select
                value={currentTalentTree?.name ?? ""}
                onChange={(e) =>
                  handleTreeChange(activeTreeSlot, e.target.value)
                }
                disabled={
                  currentTalentTree?.nodes.some((n) => n.points > 0) ?? false
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">선택 안 함</option>
                {activeTreeSlot === "tree1" ? (
                  <optgroup label="신/여신 트리">
                    {GOD_GODDESS_TREES.map((tree) => (
                      <option key={tree} value={tree}>
                        {i18n._(tree.replace(/_/g, " "))}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup label="직업 트리">
                    {PROFESSION_TREES.map((tree) => (
                      <option key={tree} value={tree}>
                        {i18n._(tree.replace(/_/g, " "))}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => handleResetTree(activeTreeSlot)}
                disabled={currentTreeTotalPoints === 0}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Core talent selector(s) */}
          {coreTalentSlots.map((slot) => (
            <div key={slot.index} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-400">
                {i18n._(slot.label)}
              </label>
              <select
                value={slot.selected ?? ""}
                onChange={(e) =>
                  selectCoreTalent(
                    activeTreeSlot,
                    slot.index,
                    e.target.value === "" ? undefined : e.target.value,
                  )
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50"
              >
                <option value="">선택 안 함</option>
                {slot.available.map((ct) => (
                  <option key={ct.name} value={ct.name}>
                    {i18n._(ct.name)}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Prism replaced indicator */}
          {currentTalentTree?.replacementPrismCoreTalent !== undefined && (
            <div className="flex items-center gap-1 rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-xs text-purple-400">
              제노프리즘(에테르 재능)으로 인해 코어 재능이 비활성화되었습니다
            </div>
          )}
        </div>

        <PrismCoreTalentEffect
          placedPrism={placedPrism}
          activeTreeSlot={activeTreeSlot}
        />

        {!currentTalentTree ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            {/* Empty placeholder matching TalentGrid dimensions (1040x560) + column headers */}
            <div className="mb-2 h-5" />
            <div style={{ width: 1040, height: 560 }} />
          </div>
        ) : currentTalentTree ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <div className="mb-2 grid grid-cols-7 gap-2">
              {[0, 3, 6, 9, 12, 15, 18].map((points) => (
                <div
                  key={points}
                  className="text-center text-sm font-medium text-zinc-500"
                >
                  {points} pts
                </div>
              ))}
            </div>

            <TalentGrid
              nodes={currentTalentTree.nodes}
              onAllocate={(x, y) => handleAllocate(activeTreeSlot, x, y)}
              onDeallocate={(x, y) => deallocateNode(activeTreeSlot, x, y)}
              treeSlot={activeTreeSlot}
              placedPrism={placedPrism}
              selectedPrism={
                // Prisms can only be placed on profession trees (slots 2-4)
                activeTreeSlot !== "tree1"
                  ? prismList.find((p) => p.id === selectedPrismId)
                  : undefined
              }
              onPlacePrism={(x, y) => handlePlacePrism(activeTreeSlot, x, y)}
              onRemovePrism={handleRemovePrism}
              placedInverseImage={placedInverseImage}
              selectedInverseImage={
                // Inverse images can only be placed on profession trees (slots 2-4)
                activeTreeSlot !== "tree1"
                  ? inverseImageList.find(
                      (ii) => ii.id === selectedInverseImageId,
                    )
                  : undefined
              }
              onPlaceInverseImage={(x, y) =>
                handlePlaceInverseImage(activeTreeSlot, x, y)
              }
              onRemoveInverseImage={handleRemoveInverseImage}
              onAllocateReflected={allocateReflectedNode}
              onDeallocateReflected={deallocateReflectedNode}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500">
            트리 데이터를 불러오는 중입니다...
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PrismSection
          prisms={prismList}
          onSave={(prism) => addPrismToInventory(prism)}
          onUpdate={updatePrism}
          onCopy={(prism: CraftedPrism) => copyPrism(prism.id)}
          onDelete={handleDeletePrism}
          selectedPrismId={selectedPrismId}
          onSelectPrism={setSelectedPrismId}
          hasPrismPlaced={!!placedPrism}
          isOnGodGoddessTree={activeTreeSlot === "tree1"}
        />

        <InverseImageSection
          inverseImages={inverseImageList}
          onSave={(inverseImage: CraftedInverseImage) =>
            addInverseImageToInventory(inverseImage)
          }
          onUpdate={updateInverseImage}
          onCopy={(inverseImage: CraftedInverseImage) =>
            copyInverseImage(inverseImage.id)
          }
          onDelete={handleDeleteInverseImage}
          selectedInverseImageId={selectedInverseImageId}
          onSelectInverseImage={setSelectedInverseImageId}
          hasInverseImagePlaced={!!placedInverseImage}
          hasPrismPlaced={!!placedPrism}
          isOnGodGoddessTree={activeTreeSlot === "tree1"}
          treeHasPoints={currentTreeTotalPoints > 0}
        />
      </div>
    </>
  );
}
