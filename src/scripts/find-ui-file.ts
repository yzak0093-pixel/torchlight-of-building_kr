import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function searchFiles(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    // 폴더 내부 계속 탐색 (node_modules, .git 등 제외)
    if (
      entry.isDirectory() &&
      !fullPath.includes("node_modules") &&
      !fullPath.includes(".git")
    ) {
      await searchFiles(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".tsx")) {
      const content = await readFile(fullPath, "utf-8");

      // '스탯 요약' 패널을 그리는 단서 찾기
      if (
        content.includes("Stat Summary") ||
        content.includes("stat-summary") ||
        content.includes("calculations tab")
      ) {
        console.log(`\n🎯 [스탯 UI 파일 발견!] 경로: ${fullPath}`);
        console.log("--- 파일 상단 구조 -------------------------------------");
        console.log(content.split("\n").slice(0, 30).join("\n")); // 위쪽 30줄 출력
        console.log("------------------------------------------------------");
      }
    }
  }
}

console.log("🔍 화면 왼쪽 스탯 패널을 그리는 UI 파일을 찾습니다...");
searchFiles(join(process.cwd(), "src")).catch(console.error);
