import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "builder",
  "StatsPanel.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  const searchStr = `<div className="grid grid-cols-2 gap-4">`;
  const startIndex = content.indexOf(searchStr);
  if (startIndex === -1) return console.error("Target div not found!");

  const beforeContent = content.substring(0, startIndex);
  const newTail = `<div className="grid grid-cols-2 gap-4">
                {(() => {
                  const hasStates = resourcePool.hasFervor || resourcePool.hasHasten;
                  const focusB = resourcePool.focusBlessings ?? 0;
                  const agilityB = resourcePool.agilityBlessings ?? 0;
                  const tenacityB = resourcePool.tenacityBlessings ?? 0;
                  const hasBlessings = focusB > 0 || agilityB > 0 || tenacityB > 0;
                  const chanStacks = resourcePool.additionalMaxChanneledStacks ?? 0;
                  const mpSeal = resourcePool.sealedResources?.sealedManaPct ?? 0;
                  const hpSeal = resourcePool.sealedResources?.sealedLifePct ?? 0;
                  const hasSpecial = chanStacks > 0 || mpSeal > 0 || hpSeal > 0;
                  const cMax = defenses.coldRes?.max ?? 60;
                  const lMax = defenses.lightningRes?.max ?? 60;
                  const fMax = defenses.fireRes?.max ?? 60;
                  const eMax = defenses.erosionRes?.max ?? 60;
                  const hasMaxRes = cMax !== 60 || lMax !== 60 || fMax !== 60 || eMax !== 60;
                  const hasAnyAdvancedStats = hasStates || hasBlessings || hasSpecial || hasMaxRes;

                  if (!hasAnyAdvancedStats) {
                    return (
                      <div className="col-span-2 text-center text-zinc-400 py-10 bg-zinc-800/30 rounded-lg border border-zinc-700/50 border-dashed">
                        활성화된 고급 스탯이나 버프가 없습니다.
                      </div>
                    );
                  }

                  return (
                    <>
                      {hasStates && (
                        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 h-fit">
                          <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                            상태 & 버프 (States)
                          </h3>
                          <div className="space-y-1.5">
                            {resourcePool.hasFervor && <StatLine label="전의 (Fervor)" value={\`적용 중 (\${resourcePool.fervorPts} pts)\`} highlight />}
                            {resourcePool.hasHasten && <StatLine label="신속 (Hasten)" value="적용 중" highlight />}
                          </div>
                        </div>
                      )}

                      {hasBlessings && (
                        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 h-fit">
                          <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                            축복 스택 (Blessings)
                          </h3>
                          <div className="space-y-1.5">
                            {focusB > 0 && <StatLine label="집요한 축복" value={\`\${focusB} / \${resourcePool.maxFocusBlessings ?? 0}\`} highlight />}
                            {agilityB > 0 && <StatLine label="황홀한 축복" value={\`\${agilityB} / \${resourcePool.maxAgilityBlessings ?? 0}\`} highlight />}
                            {tenacityB > 0 && <StatLine label="강건한 축복" value={\`\${tenacityB} / \${resourcePool.maxTenacityBlessings ?? 0}\`} highlight />}
                          </div>
                        </div>
                      )}

                      {hasSpecial && (
                        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 h-fit">
                          <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                            특수 & 채널링 (Special)
                          </h3>
                          <div className="space-y-1.5">
                            {chanStacks > 0 && <StatLine label="채널링 최대 중첩 증가" value={\`+\${chanStacks}\`} highlight />}
                            {mpSeal > 0 && <StatLine label="MP 봉인 보상" value={\`\${mpSeal}%\`} highlight />}
                            {hpSeal > 0 && <StatLine label="HP 봉인 보상" value={\`\${hpSeal}%\`} highlight />}
                          </div>
                        </div>
                      )}

                      {hasMaxRes && (
                        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 h-fit">
                          <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">
                            최대 저항 한도 (Max Res)
                          </h3>
                          <div className="space-y-1.5">
                            {cMax !== 60 && <StatLine label="냉기 저항 한도" value={\`\${cMax}%\`} />}
                            {lMax !== 60 && <StatLine label="번개 저항 한도" value={\`\${lMax}%\`} />}
                            {fMax !== 60 && <StatLine label="화염 저항 한도" value={\`\${fMax}%\`} />}
                            {eMax !== 60 && <StatLine label="부식 저항 한도" value={\`\${eMax}%\`} />}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;
  await writeFile(TARGET_FILE, beforeContent + newTail, "utf-8");
  console.log(
    "✅ [모달창 패치 완료] 활성화된 스탯만 보이도록 UI가 개편되었습니다!",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};
main().catch(console.error);
