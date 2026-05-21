import type { ImplementedActiveSkillName } from "@/src/data/skill/types";
import type {
  CritChance,
  OffenseComboDpsSummary,
  OffenseSlashStrikeDpsSummary,
  OffenseSpellBurstDpsSummary,
  OffenseSpellDpsSummary,
  PersistentDpsSummary,
  Resistance,
  TotalReapDpsSummary,
} from "@/src/tli/calcs/offense";
import { formatStatValue } from "../../lib/calculations-utils";
import { useCalculationsSelectedSkill } from "../../stores/builderStore";
import { useOffenseResults } from "./OffenseResultsContext";

const formatRes = (res: Resistance): string => {
  if (res.potential > res.actual) {
    return `${res.actual}% (${res.potential}%)`;
  }
  return `${res.actual}%`;
};

const formatCritChance = (crit: CritChance): string => {
  const actual = formatStatValue.percentage(crit.actual);
  if (crit.uncapped > 1) {
    return `${actual} (${formatStatValue.percentage(crit.uncapped)})`;
  }
  return actual;
};

const StatLine = ({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
}): React.ReactNode => {
  const valueClass =
    highlight === true
      ? "text-amber-400 font-bold"
      : (color ?? "text-zinc-200");
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-400">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
};

const PersistentDpsSection = ({
  summary,
}: {
  summary: PersistentDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="지속 DPS"
        value={formatStatValue.dps(summary.total)}
        highlight
      />
      <StatLine
        label="지속 시간"
        value={formatStatValue.duration(summary.duration)}
      />
    </>
  );
};

const ReapDpsSection = ({
  summary,
}: {
  summary: TotalReapDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="총 수확 DPS"
        value={formatStatValue.dps(summary.totalReapDps)}
        highlight
      />
      <StatLine
        label="지속 시간 보너스"
        value={formatStatValue.pct(summary.reapDurationBonusPct)}
      />
      <StatLine
        label="쿨타임 감소 보너스"
        value={formatStatValue.pct(summary.reapCdrBonusPct)}
      />
    </>
  );
};

const SpellDpsSection = ({
  summary,
}: {
  summary: OffenseSpellDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="주술 DPS"
        value={formatStatValue.dps(summary.avgDps)}
        highlight
      />
      <StatLine
        label="평균 적중 (치명)"
        value={formatStatValue.damage(summary.avgHitWithCrit)}
      />
      <StatLine
        label="크리티컬 확률"
        value={formatCritChance(summary.critChance)}
      />
      <StatLine
        label="크리티컬 배율"
        value={formatStatValue.multiplier(summary.critDmgMult)}
      />
      <StatLine
        label="시전/초"
        value={formatStatValue.aps(summary.castsPerSec)}
      />
    </>
  );
};

const ComboDpsSection = ({
  summary,
}: {
  summary: OffenseComboDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="콤보 DPS"
        value={formatStatValue.dps(summary.avgDps)}
        highlight
      />
      <StatLine label="콤보 포인트" value={summary.comboPoints} />
      <StatLine
        label="피니셔 증폭"
        value={formatStatValue.pct(summary.comboFinisherAmplificationPct)}
      />
      <StatLine
        label="크리티컬 배율"
        value={formatStatValue.multiplier(summary.critDmgMult)}
      />
    </>
  );
};

const SlashStrikeDpsSection = ({
  summary,
}: {
  summary: OffenseSlashStrikeDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="베기 공격 DPS"
        value={formatStatValue.dps(summary.avgDps)}
        highlight
      />
      <StatLine
        label="가파른 타격 확률"
        value={formatStatValue.pct(summary.steepStrikeChancePct)}
      />
      <StatLine
        label="크리티컬 배율"
        value={formatStatValue.multiplier(summary.critDmgMult)}
      />
      <StatLine
        label="휩쓸기 평균 적중"
        value={formatStatValue.damage(summary.sweep.mainhand.avgHit)}
      />
      <StatLine
        label="휩쓸기 평균 (치명)"
        value={formatStatValue.damage(summary.sweep.mainhand.avgHitWithCrit)}
      />
      <StatLine
        label="가파른 타격 평균 적중"
        value={formatStatValue.damage(summary.steep.mainhand.avgHit)}
      />
      <StatLine
        label="가파른 타격 평균 (치명)"
        value={formatStatValue.damage(summary.steep.mainhand.avgHitWithCrit)}
      />
      <StatLine
        label="크리티컬 확률"
        value={formatCritChance(summary.sweep.mainhand.critChance)}
      />
      <StatLine
        label="공격 속도"
        value={formatStatValue.aps(summary.sweep.mainhand.aspd)}
      />
      {summary.multistrikeChancePct > 0 && (
        <>
          <StatLine
            label="다중 타격 확률"
            value={formatStatValue.pct(summary.multistrikeChancePct)}
          />
          <StatLine
            label="다중 타격 대미지 증가"
            value={formatStatValue.pct(summary.multistrikeIncDmgPct)}
          />
        </>
      )}
    </>
  );
};

const SpellBurstDpsSection = ({
  summary,
}: {
  summary: OffenseSpellBurstDpsSummary;
}): React.ReactNode => {
  return (
    <>
      <StatLine
        label="버스트 DPS"
        value={formatStatValue.dps(summary.avgDps)}
        highlight
      />
      <StatLine label="버스트/초" value={summary.burstsPerSec.toFixed(2)} />
      <StatLine
        label="최대 주술 버스트"
        value={formatStatValue.integer(summary.maxSpellBurst)}
      />
      {summary.ingenuityOverload !== undefined && (
        <>
          <StatLine
            label="과부하 DPS"
            value={formatStatValue.dps(summary.ingenuityOverload.avgDps)}
            color="text-teal-400"
          />
          <StatLine
            label="과부하 간격"
            value={formatStatValue.duration(summary.ingenuityOverload.interval)}
            color="text-teal-400"
          />
        </>
      )}
    </>
  );
};

export const StatsPanel = (): React.ReactNode => {
  const savedSkillName = useCalculationsSelectedSkill();
  const selectedSkill = savedSkillName as
    | ImplementedActiveSkillName
    | undefined;

  const offenseResults = useOffenseResults();
  const { skills, resourcePool, defenses } = offenseResults;
  const offenseSummary =
    selectedSkill !== undefined ? skills[selectedSkill] : undefined;

  const hasDamageStats =
    offenseSummary?.attackDpsSummary !== undefined ||
    offenseSummary?.comboDpsSummary !== undefined ||
    offenseSummary?.slashStrikeDpsSummary !== undefined ||
    offenseSummary?.spellDpsSummary !== undefined ||
    offenseSummary?.spellBurstDpsSummary !== undefined ||
    offenseSummary?.persistentDpsSummary !== undefined ||
    offenseSummary?.totalReapDpsSummary !== undefined;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-zinc-50">스탯 요약</h3>

      <div className="space-y-0.5">
        {hasDamageStats && offenseSummary !== undefined ? (
          <>
            <StatLine label="스킬" value={selectedSkill ?? ""} />
            <StatLine
              label="총 DPS"
              value={formatStatValue.dps(offenseSummary.totalDps)}
              highlight
            />

            {offenseSummary.attackDpsSummary !== undefined && (
              <>
                <StatLine
                  label="평균 DPS"
                  value={formatStatValue.dps(
                    offenseSummary.attackDpsSummary.avgDps,
                  )}
                  highlight
                />
                <StatLine
                  label="크리티컬 배율"
                  value={formatStatValue.multiplier(
                    offenseSummary.attackDpsSummary.critDmgMult,
                  )}
                />
                <StatLine
                  label={
                    offenseSummary.attackDpsSummary.offhand !== undefined
                      ? "Avg Hit (MH)"
                      : "Avg Hit"
                  }
                  value={formatStatValue.damage(
                    offenseSummary.attackDpsSummary.mainhand.avgHit,
                  )}
                />
                <StatLine
                  label={
                    offenseSummary.attackDpsSummary.offhand !== undefined
                      ? "Avg Hit crit (MH)"
                      : "평균 적중 (치명)"
                  }
                  value={formatStatValue.damage(
                    offenseSummary.attackDpsSummary.mainhand.avgHitWithCrit,
                  )}
                />
                <StatLine
                  label={
                    offenseSummary.attackDpsSummary.offhand !== undefined
                      ? "Crit Chance (MH)"
                      : "크리티컬 확률"
                  }
                  value={formatCritChance(
                    offenseSummary.attackDpsSummary.mainhand.critChance,
                  )}
                />
                <StatLine
                  label={
                    offenseSummary.attackDpsSummary.offhand !== undefined
                      ? "Attack Speed (MH)"
                      : "공격 속도"
                  }
                  value={formatStatValue.aps(
                    offenseSummary.attackDpsSummary.mainhand.aspd,
                  )}
                />
                {offenseSummary.attackDpsSummary.offhand !== undefined && (
                  <>
                    <StatLine
                      label="평균 적중 (부무기)"
                      value={formatStatValue.damage(
                        offenseSummary.attackDpsSummary.offhand.avgHit,
                      )}
                    />
                    <StatLine
                      label="평균 적중 치명 (부무기)"
                      value={formatStatValue.damage(
                        offenseSummary.attackDpsSummary.offhand.avgHitWithCrit,
                      )}
                    />
                    <StatLine
                      label="크리티컬 확률 (부무기)"
                      value={formatCritChance(
                        offenseSummary.attackDpsSummary.offhand.critChance,
                      )}
                    />
                    <StatLine
                      label="공격 속도 (부무기)"
                      value={formatStatValue.aps(
                        offenseSummary.attackDpsSummary.offhand.aspd,
                      )}
                    />
                  </>
                )}
                {offenseSummary.attackDpsSummary.multistrikeChancePct > 0 && (
                  <>
                    <StatLine
                      label="다중 타격 확률"
                      value={formatStatValue.pct(
                        offenseSummary.attackDpsSummary.multistrikeChancePct,
                      )}
                    />
                    <StatLine
                      label="다중 타격 대미지 증가"
                      value={formatStatValue.pct(
                        offenseSummary.attackDpsSummary.multistrikeIncDmgPct,
                      )}
                    />
                  </>
                )}
              </>
            )}

            {offenseSummary.comboDpsSummary !== undefined && (
              <>
                <div className="h-2" />
                <ComboDpsSection summary={offenseSummary.comboDpsSummary} />
              </>
            )}

            {offenseSummary.slashStrikeDpsSummary !== undefined && (
              <>
                <div className="h-2" />
                <SlashStrikeDpsSection
                  summary={offenseSummary.slashStrikeDpsSummary}
                />
              </>
            )}

            {offenseSummary.spellDpsSummary !== undefined && (
              <SpellDpsSection summary={offenseSummary.spellDpsSummary} />
            )}

            {offenseSummary.spellBurstDpsSummary !== undefined && (
              <>
                <div className="h-2" />
                <SpellBurstDpsSection
                  summary={offenseSummary.spellBurstDpsSummary}
                />
              </>
            )}

            {offenseSummary.persistentDpsSummary !== undefined && (
              <>
                <div className="h-2" />
                <PersistentDpsSection
                  summary={offenseSummary.persistentDpsSummary}
                />
              </>
            )}

            {offenseSummary.totalReapDpsSummary !== undefined && (
              <>
                <div className="h-2" />
                <ReapDpsSection summary={offenseSummary.totalReapDpsSummary} />
              </>
            )}

            {offenseSummary.tangleSummary !== undefined && (
              <>
                <div className="h-2" />
                <StatLine
                  label="최대 엉킴"
                  value={formatStatValue.integer(
                    offenseSummary.tangleSummary.maxTangles,
                  )}
                />
                <StatLine
                  label="적당 최대 엉킴"
                  value={formatStatValue.integer(
                    offenseSummary.tangleSummary.maxTanglesPerEnemy,
                  )}
                />
              </>
            )}

            <div className="h-2" />
            <StatLine
              label="이동 속도"
              value={formatStatValue.pct(offenseSummary.movementSpeedBonusPct)}
              color="text-green-400"
            />

            <div className="h-2" />
          </>
        ) : (
          <p className="mb-3 text-sm text-zinc-400">
            Select an active skill in the Calculations tab to view damage stats.
          </p>
        )}

        <StatLine
          label="힘"
          value={formatStatValue.integer(resourcePool.stats.str)}
        />
        <StatLine
          label="민첩"
          value={formatStatValue.integer(resourcePool.stats.dex)}
        />
        <StatLine
          label="지능"
          value={formatStatValue.integer(resourcePool.stats.int)}
        />

        <div className="h-2" />

        <StatLine
          label="최대 HP"
          value={formatStatValue.integer(resourcePool.maxLife)}
          color="text-red-400"
        />
        <StatLine
          label="최대 MP"
          value={formatStatValue.integer(resourcePool.maxMana)}
          color="text-blue-400"
        />
        {resourcePool.sealedResources.sealedManaPct > 0 && (
          <StatLine
            label="봉인 MP"
            value={formatStatValue.pct(
              resourcePool.sealedResources.sealedManaPct,
            )}
            color="text-blue-300"
          />
        )}
        {resourcePool.sealedResources.sealedLifePct > 0 && (
          <StatLine
            label="봉인 HP"
            value={formatStatValue.pct(
              resourcePool.sealedResources.sealedLifePct,
            )}
            color="text-red-300"
          />
        )}
        {resourcePool.mercuryPts !== undefined && (
          <StatLine
            label="수은"
            value={formatStatValue.integer(resourcePool.mercuryPts)}
            color="text-purple-400"
          />
        )}

        <div className="h-2" />

        <StatLine
          label="보호막"
          value={formatStatValue.integer(defenses.energyShield)}
          color="text-teal-400"
        />

        <StatLine
          label="방어도"
          value={formatStatValue.integer(defenses.armor)}
          color="text-red-400"
        />

        <StatLine
          label="회피"
          value={formatStatValue.integer(defenses.evasion)}
          color="text-green-400"
        />

        <div className="h-2" />

        <StatLine
          label="냉기 저항"
          value={formatRes(defenses.coldRes)}
          color="text-cyan-400"
        />
        <StatLine
          label="번개 저항"
          value={formatRes(defenses.lightningRes)}
          color="text-yellow-400"
        />
        <StatLine
          label="화염 저항"
          value={formatRes(defenses.fireRes)}
          color="text-orange-400"
        />
        <StatLine
          label="부식 저항"
          value={formatRes(defenses.erosionRes)}
          color="text-fuchsia-400"
        />

        <div className="h-2" />

        <StatLine
          label="공격 막기"
          value={formatStatValue.pct(defenses.attackBlockPct)}
          color="text-slate-300"
        />
        <StatLine
          label="주술 막기"
          value={formatStatValue.pct(defenses.spellBlockPct)}
          color="text-slate-300"
        />
        <StatLine
          label="막기 비율"
          value={formatStatValue.pct(defenses.blockRatioPct)}
          color="text-slate-300"
        />
      </div>
    </div>
  );
};
