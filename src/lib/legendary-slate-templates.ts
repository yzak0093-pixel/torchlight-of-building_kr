import type { AnySlateShape, DivinityAffixType } from "@/src/tli/core";

export interface AffixSlotConstraint {
  allowedTypes: DivinityAffixType[];
  label: string;
}

export type CopyDirection = "up" | "down" | "left" | "right";

export interface FixedAffix {
  text: string;
  direction?: CopyDirection;
}

export interface LegendarySlateTemplate {
  key: string;
  displayName: string;
  shape: AnySlateShape;
  canRotate: boolean;
  canFlip: boolean;
  affixSlots: AffixSlotConstraint[];
  fixedAffixes?: FixedAffix[];
  description?: string;
}

export const LEGENDARY_SLATE_TEMPLATES: Record<string, LegendarySlateTemplate> =
  {
    "sparks-of-moth-fire": {
      key: "sparks-of-moth-fire",
      displayName: "빛이 된 나방",
      shape: "Single",
      canRotate: false,
      canFlip: false,
      affixSlots: [],
      fixedAffixes: [
        {
          text: "Copies the last Talent on the adjacent slate above to this slate. Unable to copy the Core Talent.",
          direction: "up",
        },
        {
          text: "Copies the last Talent on the adjacent slate on the left to this slate. Unable to copy the Core Talent.",
          direction: "left",
        },
        {
          text: "Copies the last Talent on the adjacent slate below this slate. Unable to copy the Core Talents.",
          direction: "down",
        },
        {
          text: "Copies the last Talent on the adjacent slate on the right to this slate. Unable to copy the Core Talent.",
          direction: "right",
        },
      ],
      description: "1x1 slate that copies a talent from an adjacent direction",
    },
    "sparks-set-prairie": {
      key: "sparks-set-prairie",
      displayName: "들불 번지는 순간",
      shape: "Single",
      canRotate: false,
      canFlip: false,
      affixSlots: [],
      fixedAffixes: [
        {
          text: "Copies the last Talent on all adjacent slates. Unable to copy Core Talents.",
        },
      ],
      description: "1x1 slate that copies talents from all adjacent slates",
    },
    "corner-of-divinity": {
      key: "corner-of-divinity",
      displayName: "신성의 일각",
      shape: "CornerL",
      canRotate: true,
      canFlip: true,
      affixSlots: [
        { allowedTypes: ["Legendary Medium"], label: "Legendary Medium" },
        { allowedTypes: ["Legendary Medium"], label: "Legendary Medium" },
      ],
      description: "3-cell L-shape with up to 2 Legendary Medium affixes",
    },
    "fallen-starlight": {
      key: "fallen-starlight",
      displayName: "추락하는 별빛",
      shape: "Vertical2",
      canRotate: true,
      canFlip: true,
      affixSlots: [
        { allowedTypes: ["Micro"], label: "Micro" },
        { allowedTypes: ["Micro"], label: "Micro" },
        {
          allowedTypes: ["Micro", "Medium", "Legendary Medium"],
          label: "Micro/Medium/Legendary",
        },
        {
          allowedTypes: ["Medium", "Legendary Medium"],
          label: "Medium/Legendary",
        },
      ],
      description: "2-cell vertical shape with 4 mixed affixes",
    },
    "pedigree-of-gods": {
      key: "pedigree-of-gods",
      displayName: "신의 계보",
      shape: "Pedigree",
      canRotate: true,
      canFlip: true,
      affixSlots: [
        {
          allowedTypes: ["Micro", "Medium", "Legendary Medium"],
          label: "Micro/Medium/Legendary",
        },
        {
          allowedTypes: ["Micro", "Medium", "Legendary Medium"],
          label: "Micro/Medium/Legendary",
        },
        {
          allowedTypes: ["Medium", "Legendary Medium", "Core"],
          label: "Medium/Legendary/Core",
        },
        { allowedTypes: ["Core"], label: "Core" },
      ],
      description: "7-cell shape with 4 affixes including core talents",
    },
    "space-rift": {
      key: "space-rift",
      displayName: "우주의 균열",
      shape: "Vertical6",
      canRotate: true,
      canFlip: false,
      affixSlots: [],
      fixedAffixes: [
        {
          text: "왼쪽 석판의 중위 재능을 해당 석판으로 복제한다.",
          direction: "left",
        },
        {
          text: "오른쪽 석판의 중위 재능을 해당 석판으로 복제한다.",
          direction: "right",
        },
      ],
      description: "왼쪽/오른쪽 석판의 중위 재능을 복제하는 석판",
    },
    "residence-of-stars": {
      key: "residence-of-stars",
      displayName: "별들의 고향",
      shape: "Pinwheel",
      canRotate: true,
      canFlip: true,
      affixSlots: [],
      fixedAffixes: [
        {
          text: "인접 석판의 중위 재능을 해당 석판으로 복제한다. 레전드 중위 재능은 복제할 수 없다.",
        },
      ],
      description: "인접 석판의 중위 재능을 복제하는 석판",
    },
  };

export const LEGENDARY_SLATE_KEYS = Object.keys(
  LEGENDARY_SLATE_TEMPLATES,
) as (keyof typeof LEGENDARY_SLATE_TEMPLATES)[];

export const getLegendarySlateTemplate = (
  key: string,
): LegendarySlateTemplate | undefined => {
  return LEGENDARY_SLATE_TEMPLATES[key];
};
