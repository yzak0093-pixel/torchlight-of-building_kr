import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const MAP_FILE = join(
  process.cwd(),
  "src",
  "tli",
  "mod-parser",
  "ko-en-affix-map.ts",
);

const main = async () => {
  let content = await readFile(MAP_FILE, "utf-8");
  const funcRegex = /export const translateAffixToEn = \([\s\S]+$/;

  const newFunc = `export const translateAffixToEn = (text: string): string => {
  let t = text.trim();

  // 1. UI 찌꺼기 무시 (안전 장치)
  if (t.includes("$(document).ready") || /^Tier$/.test(t) || /^메인 옵션$/.test(t) || /^서브 옵션$/.test(t) || t.includes("옵션 /") || t.includes("Item /") || /^옵션 효과$/.test(t) || t.includes("레벨 조건")) {
    return t;
  }

  let m;
  // 🚀 2. TOB 엔진 전용 최우선 강제 치환 (대현자 벨트 에러 및 마침표 찌꺼기 완벽 호환)
  if ((m = t.match(/신속을 보유한다\\.?/))) return "has hasten";
  if ((m = t.match(/흉갑에서 획득한 방어\\s*\\+?([\\d\\.\\-–~]+)%\\s*\\.?/))) return \`+\${m[1]}% Armor from Chest Armor\`;
  if ((m = t.match(/악화 대미지\\s*\\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt damage\`;
  if ((m = t.match(/악화 확률\\s*\\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt chance\`;
  if ((m = t.match(/악화 지속 시간\\s*\\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% wilt duration\`;
  if ((m = t.match(/MP 봉인 보상\\s*\\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Sealed Mana Compensation\`;
  if ((m = t.match(/점화 최대치\\s*\\+?([\\d\\.\\-–~]+)/))) return \`+\${m[1]} Maximum Ignites\`;
  if ((m = t.match(/점화 대미지 추가\\s*\\+?([\\d\\.\\-–~]+)%/))) return \`+\${m[1]}% Ignite Damage\`;
  if ((m = t.match(/([\\d\\.\\-–~]+)초당\\s*([\\d\\.\\-–~]+)포인트의 트루 대미지를 받는다/))) return \`takes \${m[2]} true damage every \${m[1]}s\`;

  // 3. 고정 텍스트 완벽 매칭 (DB 기준)
  if (KO_EN_AFFIX_MAP[t]) {
    let res = KO_EN_AFFIX_MAP[t];
    if (res.includes("Wilt") || res.includes("Ailment") || res.includes("Hasten")) return res.toLowerCase();
    return res;
  }

  // 4. 수치형 패턴 안전 매칭 (DB 기준)
  const numbers: string[] = [];
  const koPat = t.replace(/[+-]?\\d+(\\.\\d+)?(–\\d+(\\.\\d+)?)?/g, (n) => {
    numbers.push(n);
    return "{N}";
  }).replace(/\\s+/g, " ").trim();

  const enPat = KO_EN_PATTERN_MAP[koPat];
  if (enPat) {
    let i = 0;
    let res = enPat.replace(/\\{N\\}/g, () => numbers[i++] ?? "");
    if (res.includes("Wilt") || res.includes("Ailment") || res.includes("Hasten")) return res.toLowerCase();
    return res;
  }

  // DB에 매칭되지 않은 데이터는 원본 반환 (계산기 충돌 방지)
  return t;
};
`;
  content = content.replace(funcRegex, newFunc);
  await writeFile(MAP_FILE, content, "utf-8");
  console.log(
    "✅ [번역 엔진 패치 완료] 대현자 벨트 등의 빨간 줄 에러가 정상 인식되도록 수정되었습니다.",
  );
  try {
    execSync("pnpm format", { stdio: "ignore" });
  } catch (e) {}
};
main().catch(console.error);
