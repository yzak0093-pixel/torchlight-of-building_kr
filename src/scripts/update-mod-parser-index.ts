import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const main = async () => {
  const indexPath = join(process.cwd(), "src", "tli", "mod-parser", "index.ts");

  const newContent = `import type { Mod } from "../mod";
import { translateAffixToEn } from "./ko-en-affix-map";
import { allParsers } from "./templates";
import type { ModParser } from "./types";

export { spec, t, ts } from "./template";
export type { TemplateBuilder } from "./types";

const multi = (parsers: ModParser[]): ModParser => ({
  parse(input: string): Mod[] | undefined {
    for (const parser of parsers) {
      const result = parser.parse(input);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  },
});

const combinedParser = multi(allParsers);

export const parseMod = (input: string): Mod[] | undefined => {
  const translated = translateAffixToEn(input.trim());
  const normalized = translated.trim().toLowerCase();
  return combinedParser.parse(normalized);
};
`;

  await writeFile(indexPath, newContent.trim(), "utf-8");
  console.log("✅ src/tli/mod-parser/index.ts 파일 덮어쓰기 완료!");

  try {
    console.log("🎨 포맷팅 적용 중...");
    execSync("pnpm format", { stdio: "inherit" });
    console.log("🎉 파서 엔진 통합이 완벽하게 끝났습니다!");
  } catch (e) {
    console.log("포맷팅 스킵");
  }
};

main().catch(console.error);
