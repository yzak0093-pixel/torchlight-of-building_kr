import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";

const GEAR_DIR_KO = join(process.cwd(), ".garbage", "tlidb", "gear");
const GEAR_DIR_EN = join(process.cwd(), ".garbage", "tlidb-en", "gear");

// 에러가 나고 있는 핵심 키워드 3가지
const targets = ["최대 HP", "추가 저주", "크리티컬 대미지 감면"];

const main = async () => {
  console.log("🔍 누락된 옵션들의 '진짜 영어 원본'을 추적합니다...\n");
  const files = (await readdir(GEAR_DIR_KO)).filter((f) => f.endsWith(".html"));

  const results = new Set();

  for (const target of targets) {
    let found = false;
    for (const file of files) {
      const koHtml = await readFile(join(GEAR_DIR_KO, file), "utf-8");
      if (koHtml.includes(target)) {
        const enHtml = await readFile(join(GEAR_DIR_EN, file), "utf-8");
        const $ko = cheerio.load(koHtml);
        const $en = cheerio.load(enHtml);

        // 모든 HTML 태그를 일대일로 대조하여 가장 안쪽에 있는 텍스트를 찾습니다.
        const koNodes = $ko("*").toArray();
        const enNodes = $en("*").toArray();

        for (let i = 0; i < koNodes.length; i++) {
          const koText = $ko(koNodes[i]).text().replace(/\s+/g, " ").trim();

          // 문장이 짧은 실제 옵션 텍스트만 필터링
          if (koText.includes(target) && koText.length < 40) {
            const enText = $en(enNodes[i]).text().replace(/\s+/g, " ").trim();

            // 한국어가 섞여있지 않은 순수 영어 텍스트인지 검증
            if (enText && !/[가-힣]/.test(enText) && !results.has(enText)) {
              console.log(`🎯 [${target}] 매칭 완료!`);
              console.log(`🇰🇷 한국어: ${koText}`);
              console.log(`🇺🇸 영어: ${enText}\n`);
              results.add(enText);
              found = true;
              break;
            }
          }
        }
      }
      if (found) break; // 하나 찾으면 다음 타겟으로 넘어감
    }
  }
};
main().catch(console.error);
