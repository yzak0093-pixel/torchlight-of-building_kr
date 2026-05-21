import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { calculateOffense, type OffenseResults } from "@/src/tli/calcs/offense";
import { useConfiguration, useLoadout } from "../../stores/builderStore";
import { recalculateAllStats } from "@/src/tli/statParser";
import { useStatsStore } from "@/src/store/statsStore";

const OffenseResultsContext = createContext<OffenseResults | undefined>(
  undefined,
);

export const OffenseResultsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const loadout = useLoadout();
  const configuration = useConfiguration();

  // 1. 기존 영어 기반 엔진 실행 (기본 뼈대)
  const baseResults = calculateOffense({ loadout, configuration });

  // 2. 장착된 아이템 추출 로직 (장비창 슬롯 순회)
  const equippedItems = useMemo(() => {
    const items: any[] = [];
    // 인벤토리가 아닌 '실제 장착된 슬롯'에서만 아이템을 가져옵니다.
    const slots = loadout?.gearPage?.slots || loadout?.gear || {};
    for (const key in slots) {
      const item = slots[key]?.item || slots[key];
      if (
        item &&
        typeof item === "object" &&
        (item.implicits || item.affixes)
      ) {
        items.push(item);
      }
    }
    return items;
  }, [loadout]);

  // 3. 장착 아이템 변경 시 한글 스탯 파서 자동 가동
  useEffect(() => {
    recalculateAllStats(equippedItems);
  }, [equippedItems]);

  // 4. 파서 결과값 구독 (계산값이 바뀌면 UI를 리렌더링)
  const rawStats = useStatsStore((state) => state.rawStats);

  // 5. 기존 결과값 + 한글 파서 결과값 완벽 융합
  const finalResults = useMemo(() => {
    const getFinal = useStatsStore.getState().getFinal;

    return {
      ...baseResults,
      resourcePool: {
        ...baseResults.resourcePool,
        // 기존 HP/MP에 새 엔진의 계산값 합산
        maxLife: baseResults.resourcePool.maxLife + getFinal("maxLife"),
        maxMana: baseResults.resourcePool.maxMana + getFinal("maxMana"),
        stats: {
          ...baseResults.resourcePool.stats,
          // 기본 스탯 합산
          str: baseResults.resourcePool.stats.str + getFinal("str"),
          dex: baseResults.resourcePool.stats.dex + getFinal("dex"),
          int: baseResults.resourcePool.stats.int + getFinal("int"),
        },
      },
      defenses: {
        ...baseResults.defenses,
        // 회피, 방어도 등 방어 스탯 합산
        evasion: baseResults.defenses.evasion + getFinal("evasion"),
      },
    };
  }, [baseResults, rawStats]);

  return (
    <OffenseResultsContext value={finalResults}>
      {children}
    </OffenseResultsContext>
  );
};

export const useOffenseResults = (): OffenseResults => {
  const ctx = useContext(OffenseResultsContext);
  if (ctx === undefined) {
    throw new Error(
      "useOffenseResults must be used within an OffenseResultsProvider",
    );
  }
  return ctx;
};
