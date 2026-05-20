const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "src",
  "components",
  "modals",
  "DestinySelectionModal.tsx",
);
let content = fs.readFileSync(filePath, "utf-8");

const replacements = [
  [
    "on확인: (destiny: InstalledDestinyResult) => void;",
    "onConfirm: (destiny: InstalledDestinyResult) => void;",
  ],
  ["on확인,", "onConfirm,"],
  ["const handle확인 = () => {", "const handleConfirm = () => {"],
  ["on확인({", "onConfirm({"],
  ["onClick={handle확인}", "onClick={handleConfirm}"],
];

for (const [old, next] of replacements) {
  if (content.includes(old)) {
    content = content.replace(old, next);
    console.log(`✅ ${old}`);
  } else {
    console.log(`❌ 못찾음: ${old}`);
  }
}

fs.writeFileSync(filePath, content, "utf-8");
console.log("완료!");
