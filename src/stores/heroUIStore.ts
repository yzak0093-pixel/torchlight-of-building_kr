"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { DEFAULT_QUALITY } from "../lib/constants";
import type { MemoryBaseStatRarity } from "../lib/hero-utils";
import type { HeroMemoryType } from "../lib/save-data";

interface MemoryAffixSlotState {
  effectIndex: number | undefined;
  quality: number;
}

const DEFAULT_BASE_STAT_RARITY: MemoryBaseStatRarity = "epic";
const DEFAULT_BASE_STAT_LEVEL = 40;

interface HeroUIState {
  // Memory modal state
  isMemoryModalOpen: boolean;
  editingMemoryId: string | undefined;

  // Memory crafting state
  craftingMemoryType: HeroMemoryType | undefined;
  craftingRarity: MemoryBaseStatRarity;
  craftingLevel: number;
  existingBaseStat: string | undefined;
  craftingBaseStatIndex: number | undefined;
  existingFixedAffixes: string[];
  existingRandomAffixes: string[];
  existingRevivedAffixes: string[]; // <-- 재구성 옵션 (신규)
  fixedAffixSlots: MemoryAffixSlotState[];
  randomAffixSlots: MemoryAffixSlotState[];
  revivedAffixSlots: MemoryAffixSlotState[]; // <-- 재구성 옵션 슬롯 (신규)

  // Actions
  openMemoryModal: (memoryId?: string) => void;
  closeMemoryModal: () => void;
  setCraftingMemoryType: (type: HeroMemoryType | undefined) => void;
  setCraftingRarity: (rarity: MemoryBaseStatRarity) => void;
  setCraftingLevel: (level: number) => void;
  setExistingBaseStat: (value: string | undefined) => void;
  setCraftingBaseStatIndex: (index: number | undefined) => void;
  setExistingFixedAffix: (index: number, value: string | undefined) => void;
  setExistingRandomAffix: (index: number, value: string | undefined) => void;
  setExistingRevivedAffix: (index: number, value: string | undefined) => void;
  setFixedAffixSlot: (
    index: number,
    update: Partial<MemoryAffixSlotState>,
  ) => void;
  setRandomAffixSlot: (
    index: number,
    update: Partial<MemoryAffixSlotState>,
  ) => void;
  setRevivedAffixSlot: (
    index: number,
    update: Partial<MemoryAffixSlotState>,
  ) => void;
  resetMemoryCrafting: () => void;
}

const createEmptyAffixSlots = (count: number): MemoryAffixSlotState[] =>
  Array(count)
    .fill(null)
    .map(() => ({ effectIndex: undefined, quality: DEFAULT_QUALITY }));

const INITIAL_CRAFTING_STATE = {
  craftingMemoryType: undefined as HeroMemoryType | undefined,
  craftingRarity: DEFAULT_BASE_STAT_RARITY as MemoryBaseStatRarity,
  craftingLevel: DEFAULT_BASE_STAT_LEVEL,
  existingBaseStat: undefined as string | undefined,
  craftingBaseStatIndex: undefined as number | undefined,
  existingFixedAffixes: [] as string[],
  existingRandomAffixes: [] as string[],
  existingRevivedAffixes: [] as string[],
  fixedAffixSlots: createEmptyAffixSlots(2),
  randomAffixSlots: createEmptyAffixSlots(4),
  revivedAffixSlots: createEmptyAffixSlots(1), // 재구성 옵션은 보통 1개
};

export const useHeroUIStore = create<HeroUIState>()(
  immer((set) => ({
    // Initial state
    isMemoryModalOpen: false,
    editingMemoryId: undefined,
    ...INITIAL_CRAFTING_STATE,

    // Actions
    openMemoryModal: (memoryId) =>
      set((state) => {
        state.isMemoryModalOpen = true;
        state.editingMemoryId = memoryId;
      }),

    closeMemoryModal: () =>
      set((state) => {
        state.isMemoryModalOpen = false;
        state.editingMemoryId = undefined;
        Object.assign(state, {
          ...INITIAL_CRAFTING_STATE,
          fixedAffixSlots: createEmptyAffixSlots(2),
          randomAffixSlots: createEmptyAffixSlots(4),
          revivedAffixSlots: createEmptyAffixSlots(1),
        });
      }),

    setCraftingMemoryType: (type) =>
      set((state) => {
        state.craftingMemoryType = type;
        state.existingBaseStat = undefined;
        state.craftingBaseStatIndex = undefined;
        state.existingFixedAffixes = [];
        state.existingRandomAffixes = [];
        state.existingRevivedAffixes = [];
        state.fixedAffixSlots = createEmptyAffixSlots(2);
        state.randomAffixSlots = createEmptyAffixSlots(4);
        state.revivedAffixSlots = createEmptyAffixSlots(1);
      }),

    setCraftingRarity: (rarity) =>
      set((state) => {
        state.craftingRarity = rarity;
      }),

    setCraftingLevel: (level) =>
      set((state) => {
        state.craftingLevel = level;
      }),

    setExistingBaseStat: (value) =>
      set((state) => {
        state.existingBaseStat = value;
      }),

    setCraftingBaseStatIndex: (index) =>
      set((state) => {
        state.craftingBaseStatIndex = index;
      }),

    setExistingFixedAffix: (index, value) =>
      set((state) => {
        state.existingFixedAffixes[index] = value ?? "";
      }),

    setExistingRandomAffix: (index, value) =>
      set((state) => {
        state.existingRandomAffixes[index] = value ?? "";
      }),

    setExistingRevivedAffix: (index, value) =>
      set((state) => {
        state.existingRevivedAffixes[index] = value ?? "";
      }),

    setFixedAffixSlot: (index, update) =>
      set((state) => {
        Object.assign(state.fixedAffixSlots[index], update);
      }),

    setRandomAffixSlot: (index, update) =>
      set((state) => {
        Object.assign(state.randomAffixSlots[index], update);
      }),

    setRevivedAffixSlot: (index, update) =>
      set((state) => {
        Object.assign(state.revivedAffixSlots[index], update);
      }),

    resetMemoryCrafting: () =>
      set((state) => {
        Object.assign(state, {
          ...INITIAL_CRAFTING_STATE,
          fixedAffixSlots: createEmptyAffixSlots(2),
          randomAffixSlots: createEmptyAffixSlots(4),
          revivedAffixSlots: createEmptyAffixSlots(1),
        });
      }),
  })),
);
