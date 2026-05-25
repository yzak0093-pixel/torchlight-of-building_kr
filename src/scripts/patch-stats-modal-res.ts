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

  // 1. 저항 한도 섹션을 항상 렌더링하도록 조건(hasMaxRes)을 true로 강제 변경
  content = content.replace(
    "const hasMaxRes = cMax !== 60 || lMax !== 60 || fMax !== 60 || eMax !== 60;",
    "const hasMaxRes = true; // 🚀 저항 한도는 항상 표시",
  );

  // 2. 개별 저항 한도 항목들이 60%일 때도 숨지 않고 항상 표시되도록 렌더링 조건문 제거
  content = content.replace(
    /\{cMax !== 60 && <StatLine label="냉기 저항 한도" value=\{\`\$\{cMax\}%\`\} \/>\}/g,
    `<StatLine label="냉기 저항 한도" value={\`\${cMax}%\`} />`,
  );
  content = content.replace(
    /\{lMax !== 60 && <StatLine label="번개 저항 한도" value=\{\`\$\{lMax\}%\`\} \/>\}/g,
    `<StatLine label="번개 저항 한도" value={\`\${lMax}%\`} />`,
  );
  content = content.replace(
    /\{fMax !== 60 && <StatLine label="화염 저항 한도" value=\{\`\$\{fMax\}%\`\} \/>\}/g,
    `<StatLine label="화염 저항 한도" value={\`\${fMax}%\`} />`,
  );
  content = content.replace(
    /\{eMax !== 60 && <StatLine label="부식 저항 한도" value=\{\`\$\{eMax\}%\`\} \/>\}/g,
    `<StatLine label="부식 저항 한도" value={\`\${eMax}%\`} />`,
  );

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [모달창 업데이트 완료] 저항 한도가 값에 상관없이 항상 표시되도록 수정되었습니다.",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
