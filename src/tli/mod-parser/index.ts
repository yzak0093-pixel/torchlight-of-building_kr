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
  const translated = translateAffixToEn(input.trim());
  const normalized = translated.trim().toLowerCase();
  return combinedParser.parse(normalized);
};
