import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const GEAR_DIR_KO = join(process.cwd(), ".garbage", "tlidb", "gear");
const GEAR_DIR_EN = join(process.cwd(), ".garbage", "tlidb-en", "gear");

const main = async () => {
  console.log("🕵️‍♂️ 원시 형태(Raw Text) 정밀 진단을 시작합니다...");
  const files = (await readdir(GEAR_DIR_KO)).filter((f) => f.endsWith(".html"));

  // 띄어쓰기나 줄바꿈에 방해받지 않도록 핵심 단어로만 검색하는 것이 좋습니다.
  const targetKo = "화염 충전을 보유한다";
  const targetEn = "Charged Flames";

  // 공백을 모두 제거하고 비교하는 헬퍼 함수
  const normalize = (str: string) => str.replace(/\s+/g, "");

  let found = false;

  for (const file of files) {
    const koHtml = await readFile(join(GEAR_DIR_KO, file), "utf-8");

    // 공백 무시하고 포함 여부 확인
    if (normalize(koHtml).includes(normalize(targetKo))) {
      console.log(`\n🎯 단서 발견! 파일명: ${file}`);
      found = true;

      // 실제 출력할 때는 '화염' 이라는 글자 위치를 기준으로 잘라냅니다
      const koIdx = koHtml.indexOf("화염");
      if (koIdx !== -1) {
        console.log("\n[🇰🇷 한국어 원본 생짜 HTML 앞뒤 200글자]");
        console.log("--------------------------------------------------");
        console.log(koHtml.substring(Math.max(0, koIdx - 100), koIdx + 200));
        console.log("--------------------------------------------------");
      }

      const enHtml = await readFile(join(GEAR_DIR_EN, file), "utf-8");
      const enIdx = enHtml.indexOf("Charged");

      if (enIdx !== -1) {
        console.log(`\n[🇺🇸 영어 원본 생짜 HTML 앞뒤 200글자]`);
        console.log("--------------------------------------------------");
        console.log(enHtml.substring(Math.max(0, enIdx - 100), enIdx + 200));
        console.log("--------------------------------------------------");
      } else {
        console.log(
          `\n[🇺🇸 영어 원본에서 '${targetEn}' 관련 텍스트를 찾지 못했습니다.]`,
        );
      }
      break; // 찾으면 바로 종료
    }
  }

  if (!found) {
    console.log(
      `\n❌ [${targetKo}] 텍스트를 어떤 HTML 파일에서도 찾지 못했습니다.`,
    );
  }
};
main().catch(console.error);
