import { writeFile } from "node:fs/promises";
import {
  KO_EN_AFFIX_MAP,
  translateAffixToEn,
} from "../tli/mod-parser/ko-en-affix-map";
import { parseMod } from "../tli/mod-parser/index";

const main = async () => {
  console.log(
    "🕵️‍♂️ [전수 조사] 모든 한국어 옵션을 파서 엔진에 쏴서 불량품을 색출합니다...\n",
  );

  const failedList: string[] = [];
  let successCount = 0;

  for (const koText of Object.keys(KO_EN_AFFIX_MAP)) {
    try {
      const enText = translateAffixToEn(koText);
      const parsed = parseMod(enText);

      // 파서 엔진이 결과를 주지 못하면 (null, undefined, 혹은 빈 배열)
      if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
        failedList.push(
          `[🇰🇷 한국어] ${koText}\n[🇺🇸 번역됨] ${enText}\n--------------------------------------------------`,
        );
      } else {
        successCount++;
      }
    } catch (e) {
      failedList.push(
        `[🇰🇷 한국어] ${koText}\n[❌ 에러] 파싱 중 크래시 발생\n--------------------------------------------------`,
      );
    }
  }

  console.log(`✅ 파서 엔진 통과 (성공): ${successCount}개`);
  console.log(`❌ 파서 엔진 거부 (실패): ${failedList.length}개`);

  if (failedList.length > 0) {
    await writeFile("unsupported-mods.txt", failedList.join("\n"), "utf-8");
    console.log(
      "\n📄 프로젝트 최상단 폴더에 'unsupported-mods.txt' 파일이 생성되었습니다!",
    );
    console.log(
      "열어보시면 에러가 나는 모든 옵션의 원인(어떻게 번역되어 튕겼는지)을 확인하실 수 있습니다.",
    );
  }
};

main().catch(console.error);
