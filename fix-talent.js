const fs = require("fs");
const file = "src/scripts/generate-talent-data.ts";
let content = fs.readFileSync(file, "utf8");
content = content.replace(/#\("[^"]*"\)/, '$("#재능")');
content = content.replace(/id="[^"]*"\)/, 'id="재능")');
content = content.replace(/"[^"]{2,20}": "Micro"/, '"하위 재능": "Micro"');
content = content.replace(/"[^"]{2,20}": "Medium"/, '"중위 재능": "Medium"');
content = content.replace(
  /"[^"]{2,30}": "Legendary Medium"/,
  '"레전드 중위 재능": "Legendary Medium"',
);
fs.writeFileSync(file, content, "utf8");
console.log("done");
