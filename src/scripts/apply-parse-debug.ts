import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const INDEX_FILE = join(process.cwd(), "src", "tli", "mod-parser", "index.ts");

const main = async () => {
  let content = await readFile(INDEX_FILE, "utf-8");

  const newFunc = `export const parseMod = (input: string): Mod[] | undefined => {
  const trimmed = input.trim();
  const translated = translateAffixToEn(trimmed);

  // 변환 실패 감지: 한글이 여전히 남아있으면 매핑 미스
  if (translated === trimmed && /[가-힣]/.test(trimmed)) {
    console.warn(\`[매핑 누락] 한글 변환 실패: "\${trimmed}"\`);
  } else if (translated !== trimmed) {
    console.log(\`[변환 성공] "\${trimmed}" → "\${translated}"\`);
  }

  const normalized = translated.trim().toLowerCase();
  const result = combinedParser.parse(normalized);

  if (result === undefined) {
    console.warn(\`[파싱 실패] normalized: "\${normalized}"\`);
  }

  return result;
};`;

  // 기존 parseMod 블록을 정규식으로 교체
  content = content.replace(
    /export const parseMod = \([^)]*\)[^{]*\{[\s\S]*?\n\};/,
    newFunc,
  );

  await writeFile(INDEX_FILE, content, "utf-8");
  console.log("✅ index.ts에 디버깅 로직이 성공적으로 적용되었습니다.");

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
