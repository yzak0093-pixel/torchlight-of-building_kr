import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TARGET_FILE = join(
  process.cwd(),
  "src",
  "components",
  "skills",
  "SupportSkillSelector.tsx",
);

const main = async () => {
  let content = await readFile(TARGET_FILE, "utf-8");

  // 이전 패치(불도저식 전체 추가) 부분을 정규식으로 찾아냅니다.
  const searchRegex =
    /\/\/\s*🚀 모든 숭고, 부귀, 촉발 매개체를 엔진 필터링과 무관하게 무조건 목록에 강제 추가![\s\S]*?(?=if\s*\(\s*available\.compatible\.length\s*>\s*0\s*\))/;

  // 인게임 룰에 맞춘 스마트 필터링 코드로 교체합니다.
  const replacement = `// 🚀 3차 패치: 슬롯 제한(1=촉발, 3=부귀, 5=숭고) 및 메인 스킬 전용 매칭 로직 적용
    if (slotIndex === 1) {
      // 1번 슬롯: 촉발 매개체 전용
      let validAm = available.activationMedium;
      if (validAm.length === 0) validAm = ActivationMediumSkills.map((s) => s.name);
      const filteredAm = filterAndMap(validAm);
      if (filteredAm.length > 0) grps.push({ label: "Activation Medium", options: filteredAm });
    }

    if (slotIndex === 3) {
      // 3번 슬롯: 부귀(Noble) 전용 & 메인 스킬 이름 매칭
      let validNobles = available.noble;
      if (validNobles.length === 0 && mainSkill) {
        const mainName = mainSkill.name.replace(/\\s+/g, "");
        validNobles = NobleSupportSkills.filter(s => 
          s.name.replace(/\\s+/g, "") === mainName || // 이름이 완전히 같거나
          s.name.includes(mainSkill.name) || // 포함되어 있는 경우만 필터링
          mainSkill.name.includes(s.name)
        ).map(s => s.name);
      }
      const filteredNoble = filterAndMap(validNobles);
      if (filteredNoble.length > 0) grps.push({ label: "Noble", options: filteredNoble });
    }

    if (slotIndex === 5) {
      // 5번 슬롯: 숭고(Magnificent) 전용 & 메인 스킬 이름 매칭
      let validMags = available.magnificent;
      if (validMags.length === 0 && mainSkill) {
        const mainName = mainSkill.name.replace(/\\s+/g, "");
        validMags = MagnificentSupportSkills.filter(s => 
          s.name.replace(/\\s+/g, "") === mainName ||
          s.name.includes(mainSkill.name) ||
          mainSkill.name.includes(s.name)
        ).map(s => s.name);
      }
      const filteredMag = filterAndMap(validMags);
      if (filteredMag.length > 0) grps.push({ label: "Magnificent", options: filteredMag });
    }

    `;

  content = content.replace(searchRegex, replacement);

  await writeFile(TARGET_FILE, content, "utf-8");
  console.log(
    "✅ [스킬 목록 3차 정밀 패치 완료] 인게임 룰에 맞게 1번, 3번, 5번 슬롯 제한이 적용되었고 전용 스킬만 표시됩니다!",
  );

  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};

main().catch(console.error);
