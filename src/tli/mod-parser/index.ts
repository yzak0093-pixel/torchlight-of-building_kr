import type { Mod } from "../mod";
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
  const trimmed = input.trim();
  const translated = translateAffixToEn(trimmed);

  // 변환 실패 감지: 한글이 여전히 남아있으면 매핑 미스
  if (translated === trimmed && /[가-힣]/.test(trimmed)) {
    console.warn(`[매핑 누락] 한글 변환 실패: "${trimmed}"`);
  } else if (translated !== trimmed) {
    console.log(`[변환 성공] "${trimmed}" → "${translated}"`);
  }

  const normalized = translated.trim().toLowerCase();
  const result = combinedParser.parse(normalized);

  if (result === undefined) {
    console.warn(`[파싱 실패] normalized: "${normalized}"`);
  }

  return result;
};
