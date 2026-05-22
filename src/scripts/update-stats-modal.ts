import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const filePath = join(
    process.cwd(),
    "src",
    "components",
    "builder",
    "StatsPanel.tsx",
  );
  let content = await readFile(filePath, "utf-8");

  // 1. 기존의 보기 흉했던 날것의 모달창 코드를 찾아서 지웁니다.
  const modalStartIndex = content.indexOf("{/* 🚀 상세 스탯");
  const lastDivIndex = content.lastIndexOf("</div>");

  if (modalStartIndex !== -1) {
    content = content.slice(0, modalStartIndex) + content.slice(lastDivIndex);
  }

  // 2. 게임 스탯창처럼 4구역으로 나눈 깔끔한 UI 모달 코드로 재작성
  const newModalCode = `
      {/* 🚀 상세 스탯 모달창 (깔끔한 UI 버전) */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-600 shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-zinc-700 bg-zinc-800 rounded-t-xl">
              <h2 className="text-lg font-bold text-amber-400">🔍 고급 스탯 및 적용 버프 현황</h2>
              <button onClick={() => setShowDetails(false)} className="text-zinc-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* 1. 상태 및 버프 */}
                <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">상태 & 버프 (States)</h3>
                  <div className="space-y-1.5">
                    <StatLine label="전의 (Fervor)" value={resourcePool.hasFervor ? \`적용 중 (\${resourcePool.fervorPts} pts)\` : "미적용"} highlight={resourcePool.hasFervor} />
                    {resourcePool.hasHasten !== undefined && <StatLine label="신속 (Hasten)" value={resourcePool.hasHasten ? "적용 중" : "미적용"} highlight={resourcePool.hasHasten} />}
                  </div>
                </div>

                {/* 2. 축복 중첩 현황 */}
                <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">축복 스택 (Blessings)</h3>
                  <div className="space-y-1.5">
                    <StatLine label="집중의 축복" value={\`\${resourcePool.focusBlessings ?? 0} / \${resourcePool.maxFocusBlessings ?? 0}\`} highlight={(resourcePool.focusBlessings ?? 0) > 0} />
                    <StatLine label="민첩의 축복" value={\`\${resourcePool.agilityBlessings ?? 0} / \${resourcePool.maxAgilityBlessings ?? 0}\`} highlight={(resourcePool.agilityBlessings ?? 0) > 0} />
                    <StatLine label="강건의 축복" value={\`\${resourcePool.tenacityBlessings ?? 0} / \${resourcePool.maxTenacityBlessings ?? 0}\`} highlight={(resourcePool.tenacityBlessings ?? 0) > 0} />
                  </div>
                </div>

                {/* 3. 특수 자원 & 채널링 */}
                <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">특수 & 채널링 (Special)</h3>
                  <div className="space-y-1.5">
                    <StatLine label="채널링 최대 중첩 증가" value={\`+\${resourcePool.additionalMaxChanneledStacks ?? 0}\`} highlight={(resourcePool.additionalMaxChanneledStacks ?? 0) > 0} />
                    <StatLine label="MP 봉인 보상" value={\`\${resourcePool.sealedResources?.sealedManaPct ?? 0}%\`} highlight={(resourcePool.sealedResources?.sealedManaPct ?? 0) > 0} />
                    <StatLine label="HP 봉인 보상" value={\`\${resourcePool.sealedResources?.sealedLifePct ?? 0}%\`} highlight={(resourcePool.sealedResources?.sealedLifePct ?? 0) > 0} />
                  </div>
                </div>

                {/* 4. 최대 저항력 한도 */}
                <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                  <h3 className="text-amber-500 font-bold mb-3 border-b border-zinc-700 pb-1">최대 저항 한도 (Max Res)</h3>
                  <div className="space-y-1.5">
                    <StatLine label="냉기 저항 한도" value={\`\${defenses.coldRes?.max ?? 60}%\`} />
                    <StatLine label="번개 저항 한도" value={\`\${defenses.lightningRes?.max ?? 60}%\`} />
                    <StatLine label="화염 저항 한도" value={\`\${defenses.fireRes?.max ?? 60}%\`} />
                    <StatLine label="부식 저항 한도" value={\`\${defenses.erosionRes?.max ?? 60}%\`} />
                  </div>
                </div>

              </div>

              {/* 디버깅용 원본 데이터 (기본적으로 접혀있음) */}
              <details className="mt-4 text-xs text-zinc-500 cursor-pointer">
                <summary className="hover:text-zinc-300 transition-colors p-2 bg-zinc-800/30 rounded inline-block w-full text-center">
                  🛠️ 원본 엔진 데이터 전체 보기 (디버깅용)
                </summary>
                <pre className="mt-2 p-3 bg-black/50 rounded overflow-y-auto max-h-48 font-mono border border-zinc-800 text-left">
                  {JSON.stringify(offenseResults, (key, val) => (['damageInstances', 'hitDetails', 'sweep', 'steep'].includes(key) ? undefined : val), 2)}
                </pre>
              </details>

            </div>
          </div>
        </div>
      )}`;

  const newLastDivIndex = content.lastIndexOf("</div>");
  if (newLastDivIndex !== -1) {
    content =
      content.slice(0, newLastDivIndex) +
      newModalCode +
      "\n" +
      content.slice(newLastDivIndex);
  }

  await writeFile(filePath, content, "utf-8");
  console.log(
    "✅ [UI 개편 완료] 상세 스탯이 보기 좋게 정리된 모달창으로 업데이트되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
