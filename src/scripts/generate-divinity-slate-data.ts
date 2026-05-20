import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";

const BASE_URL = "https://tlidb.com/ko";
const PAGE_PATH = "Divinity_Slate";
const CACHE_PATH = join(
  process.cwd(),
  ".garbage",
  "tlidb",
  "divinity_slate.html",
);
// 실제 프로젝트에서 사용할 데이터 저장 경로
const OUTPUT_DIR = join(process.cwd(), "src", "data", "divinity");
const OUTPUT_FILE = join(OUTPUT_DIR, "slates.ts");

const main = async () => {
  const url = `${BASE_URL}/${PAGE_PATH}`;
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const cols = $("div.col");

  const slates: { name: string; god: string; stats: string }[] = [];

  cols.each((_, el) => {
    const block = $(el);
    const header = block.find("div.d-flex.justify-content-between");

    const name = header.find("span.fw-bold").text().trim();
    const god = header.find("a").text().trim();

    if (!name) return;

    const bodyBlock = block.find("div.flex-grow-1").clone();
    bodyBlock.find("div.d-flex.justify-content-between").remove();
    bodyBlock.find("br").replaceWith("\n");

    let stats = bodyBlock.text();
    stats = stats
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim();

    slates.push({ name, god, stats });
  });

  // 1. 데이터 저장용 폴더 생성
  await mkdir(OUTPUT_DIR, { recursive: true });

  // 2. TypeScript 파일 형태로 저장할 내용 구성
  const tsContent = `// 이 파일은 자동 생성되었습니다. 직접 수정하지 마세요.
// 업데이트 시 실행: pnpm exec tsx src/scripts/generate-divinity-slate-data.ts

export interface DivinitySlate {
  name: string;
  god: string;
  stats: string;
}

export const DivinitySlates: readonly DivinitySlate[] = ${JSON.stringify(slates, null, 2)};
`;

  // 3. 파일 쓰기
  await writeFile(OUTPUT_FILE, tsContent, "utf-8");

  console.log(
    `\n🎉 총 ${slates.length}개의 신격 석판 데이터를 성공적으로 저장했습니다!`,
  );
  console.log(`📂 저장 위치: ${OUTPUT_FILE}\n`);
};

main().catch(console.error);
