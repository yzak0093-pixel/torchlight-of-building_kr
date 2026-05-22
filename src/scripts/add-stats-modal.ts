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

  // 1. React 상태 관리(useState) import 추가
  if (!content.includes("useState")) {
    content = 'import { useState } from "react";\n' + content;
  }

  // 2. 컴포넌트 내부에 상태 변수 주입
  content = content.replace(
    "export const StatsPanel = (): React.ReactNode => {",
    "export const StatsPanel = (): React.ReactNode => {\n  const [showDetails, setShowDetails] = useState(false);",
  );

  // 3. 기존 '스탯 요약' 제목 옆에 노란색 [상세 스탯 보기] 버튼 추가
  content = content.replace(
    /<h3 className="mb-3 text-lg font-semibold text-zinc-50">스탯 요약<\/h3>/g,
    `<div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-zinc-50">스탯 요약</h3>
        <button onClick={() => setShowDetails(true)} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs text-white font-bold shadow transition-colors">
          상세 스탯 보기
        </button>
      </div>`,
  );

  // 4. 숨겨진 모든 데이터를 보여주는 팝업창(Modal) 코드 작성
  const modalCode = `
      {/* 🚀 상세 스탯 모달창 */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-600 shadow-2xl flex flex-col w-full max-w-4xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-zinc-700 bg-zinc-800 rounded-t-xl">
              <h2 className="text-lg font-bold text-amber-400">🔍 상세 스탯 및 적용 버프 현황</h2>
              <button onClick={() => setShowDetails(false)} className="text-zinc-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-[#1e1e1e]">
              <p className="mb-4 text-amber-300 font-bold border-b border-zinc-700 pb-2">
                ※ 아래는 TOB 계산기 엔진이 내부적으로 적용을 마친 '모든' 스탯 및 상태 데이터입니다. (신속, 축복, 채널링, 저주 등)
              </p>
              {JSON.stringify(offenseResults, (key, val) => {
                // UI가 멈추지 않도록 스킬별 길어지는 데미지 타격 로그는 생략하고 핵심 스탯만 출력
                if (key === 'damageInstances' || key === 'hitDetails' || key === 'sweep' || key === 'steep') return undefined;
                return val;
              }, 2)}
            </div>
          </div>
        </div>
      )}`;

  // 컴포넌트 렌더링이 끝나는 마지막 </div> 바로 앞에 모달창 코드 삽입
  const lastDivIndex = content.lastIndexOf("</div>");
  if (lastDivIndex !== -1) {
    content =
      content.slice(0, lastDivIndex) +
      modalCode +
      "\n" +
      content.slice(lastDivIndex);
  }

  await writeFile(filePath, content, "utf-8");
  console.log(
    "✅ [상세 스탯 보기] 버튼과 팝업창(Modal) UI 패치가 성공적으로 완료되었습니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
