const fs = require("fs");
const path = require("path");

const KO_MAP = {
  Alchemist: "연금술사",
  Arcanist: "미스틱",
  Artisan: "장인",
  Assassin: "어쌔신",
  Bladerunner: "블레이드 러너",
  Druid: "드루이드",
  Elementalist: "엘리멘탈리스트",
  "God of Machines": "기계의 신",
  "God of Might": "힘의 신",
  "God of War": "전쟁의 신",
  "Goddess of Deception": "기만의 여신",
  "Goddess of Hunting": "사냥의 여신",
  "Goddess of Knowledge": "지식의 여신",
  Lich: "언데드",
  Machinist: "정비공",
  Magister: "마기스터",
  Marksman: "명사수",
  Onslaughter: "약탈자",
  Prophet: "예언가",
  Psychic: "초능력자",
  Ranger: "레인저",
  Ronin: "사무라이",
  Sentinel: "철갑병",
  Shadowdancer: "섀도우 댄서",
  Shadowmaster: "섀도우 마스터",
  "Steel Vanguard": "철의 개척자",
  "The Brave": "용자",
  Warlock: "어둠의 술사",
  Warlord: "장군",
  Warrior: "투사",
};

// 1. 컴파일된 .ts 파일 직접 수정 (즉시 적용)
const compiledPath = path.join(__dirname, "src", "locales", "ko", "talents.ts");
if (fs.existsSync(compiledPath)) {
  let content = fs.readFileSync(compiledPath, "utf-8");
  const match = content.match(/JSON\.parse\("(.*?)"\)/);

  if (match) {
    let jsonStr = match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    let dict = JSON.parse(jsonStr);

    // 영어 키와 한국어 키 모두 한국어로 렌더링되도록 이중 맵핑
    for (const [en, ko] of Object.entries(KO_MAP)) {
      dict[en] = [ko];
      dict[ko] = [ko];
    }

    let newJsonStr = JSON.stringify(dict)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    content = content.replace(match[1], newJsonStr);
    fs.writeFileSync(compiledPath, content, "utf-8");
    console.log("✅ 1/2 컴파일된 번역 파일(talents.ts) 수정 완료!");
  }
}

// 2. 원본 .po 파일 수정 (Claude의 조언 반영)
const poPath = path.join(__dirname, "src", "locales", "ko", "talents.po");
if (fs.existsSync(poPath)) {
  let poContent = fs.readFileSync(poPath, "utf-8");
  for (const [en, ko] of Object.entries(KO_MAP)) {
    // 영어 -> 한글 치환
    const regex = new RegExp(`(msgid "${en}"\\s*\\nmsgstr )"[^"]*"`, "g");
    poContent = poContent.replace(regex, `$1"${ko}"`);

    // 한글 -> 한글 블록이 없다면 추가 (Claude 해결책)
    if (!poContent.includes(`msgid "${ko}"`)) {
      poContent += `\n\nmsgid "${ko}"\nmsgstr "${ko}"`;
    }
  }
  fs.writeFileSync(poPath, poContent, "utf-8");
  console.log("✅ 2/2 원본 번역 파일(talents.po) 수정 완료!");
}
