import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const main = async () => {
  const filePath = join(
    process.cwd(),
    "src",
    "components",
    "builder",
    "StatsPanel.tsx",
  );
  let content = await readFile(filePath, "utf-8");

  // 제 마음대로 직역했던 어설픈 이름들을 공식 게임 용어로 일괄 수정합니다.
  content = content.replace(/집중의 축복/g, "집요한 축복");
  content = content.replace(/민첩의 축복/g, "황홀한 축복");
  content = content.replace(/강건의 축복/g, "강건한 축복");

  await writeFile(filePath, content, "utf-8");
  console.log(
    "✅ 축복 이름이 게임 공식 명칭(황홀한/집요한/강건한)으로 완벽하게 수정되었습니다!",
  );
};

main().catch(console.error);
