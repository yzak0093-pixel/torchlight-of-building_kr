import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const TLIDB_SKILL_BASE = join(process.cwd(), ".garbage", "tlidb", "skill");
const TLIDB_SKILL_EN_BASE = join(
  process.cwd(),
  ".garbage",
  "tlidb",
  "skill_en",
);

export interface TlidbSkillFile {
  category: string;
  fileName: string;
  html: string;
  enHtml?: string; // English HTML for support skills (description parsing)
}

const readTlidbSkillDirectory = async (
  category: string,
): Promise<TlidbSkillFile[]> => {
  const dirPath = join(TLIDB_SKILL_BASE, category);
  const enDirPath = join(TLIDB_SKILL_EN_BASE, category);
  const files = await readdir(dirPath);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  return Promise.all(
    htmlFiles.map(async (fileName) => {
      const html = await readFile(join(dirPath, fileName), "utf-8");

      // Try to read English HTML if available (for support skills)
      let enHtml: string | undefined;
      try {
        enHtml = await readFile(join(enDirPath, fileName), "utf-8");
      } catch {
        // English file not available, that's fine
      }

      return { category, fileName: basename(fileName, ".html"), html, enHtml };
    }),
  );
};

export const readAllTlidbSkills = async (): Promise<TlidbSkillFile[]> => {
  const categories = [
    "active",
    "passive",
    "support",
    "magnificent_support",
    "noble_support",
    "activation_medium",
  ];
  const results: TlidbSkillFile[] = [];
  for (const category of categories) {
    const files = await readTlidbSkillDirectory(category);
    results.push(...files);
  }
  return results;
};
