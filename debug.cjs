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

const poPath = path.join(__dirname, "src", "locales", "ko", "talents.po");
let content = fs.readFileSync(poPath, "utf-8");

for (const [en, ko] of Object.entries(KO_MAP)) {
  // msgid "Alchemist"\nmsgstr "Alchemist" → msgstr "연금술사"
  const regex = new RegExp(
    `(msgid "${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*\\nmsgstr )"[^"]*"`,
    "g",
  );
  content = content.replace(regex, `$1"${ko}"`);
}

fs.writeFileSync(poPath, content, "utf-8");
console.log("ko/talents.po 트리 이름 번역 완료!");

// 변경된 항목 확인
for (const [en, ko] of Object.entries(KO_MAP)) {
  if (content.includes(`msgid "${en}"`)) {
    const match = content.match(
      new RegExp(
        `msgid "${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*\\nmsgstr "([^"]*)"`,
      ),
    );
    if (match) console.log(`  ${en} → ${match[1]}`);
  }
}
