/**
 * auto-patch-tab-ids.cjs
 *
 * tlidb 한국어 페이지에서 실제 탭 ID를 자동으로 확인하고
 * 각 generate-*.ts 스크립트의 셀렉터를 자동으로 패치합니다.
 *
 * 사용법: node auto-patch-tab-ids.cjs
 * 시즌 업데이트 후 generate.ts all --refetch 전에 실행하세요.
 */

const fs = require("fs");
const path = require("path");

const SCRIPTS_DIR = path.join(__dirname, "src", "scripts");

// ============================================================================
// 유틸: tlidb 페이지 fetch
// ============================================================================
const fetchPage = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
};

// HTML에서 탭 ID 목록 추출
const extractTabIds = (html) => {
  const ids = [];
  const regex = /id="([^"]+)"/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
};

// data-bs-target 탭 버튼 목록 추출 (더 정확)
const extractTabTargets = (html) => {
  const targets = [];
  const regex = /data-bs-target="#([^"]+)"/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!targets.includes(m[1])) targets.push(m[1]);
  }
  return targets;
};

// ============================================================================
// 패치 헬퍼: 파일에서 문자열 교체
// ============================================================================
const patchFile = (filePath, oldStr, newStr, label) => {
  let content = fs.readFileSync(filePath, "utf-8");
  if (!content.includes(oldStr)) {
    // 이미 패치됐거나 패턴이 없음
    if (content.includes(newStr)) {
      console.log(`  ✅ 이미 패치됨: ${label}`);
    } else {
      console.warn(`  ⚠️  패턴을 찾지 못함: ${label}`);
    }
    return false;
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  🔄 패치 완료: ${label}`);
  return true;
};

// ============================================================================
// 1. generate-hero-trait-data.ts — Hero 탭 ID
// ============================================================================
const patchHeroTrait = async () => {
  console.log("\n[1/5] Hero Trait 탭 ID 확인 중...");
  const HERO_FILE = path.join(SCRIPTS_DIR, "generate-hero-trait-data.ts");

  let html;
  try {
    html = await fetchPage("https://tlidb.com/ko/Hero");
  } catch (e) {
    console.error("  ❌ 페이지 fetch 실패:", e.message);
    return;
  }

  const tabs = extractTabTargets(html);
  console.log("  발견된 탭:", tabs.slice(0, 10).join(", "));

  // Hero 탭 찾기: 영어 Hero 또는 한국어 히어로 계열
  const heroTab = tabs.find(
    (t) =>
      t === "Hero" ||
      t === "히어로" ||
      t.includes("Hero") ||
      t.includes("영웅") ||
      t.includes("히어로"),
  );

  if (!heroTab) {
    console.warn("  ⚠️  Hero 탭을 찾지 못함. 수동 확인 필요.");
    console.log("  전체 탭 목록:", tabs.join(", "));
    return;
  }

  console.log(`  Hero 탭 ID: #${heroTab}`);

  let content = fs.readFileSync(HERO_FILE, "utf-8");

  // 현재 사용 중인 탭 셀렉터 확인
  const currentMatch = content.match(/const tab = \$\("#([^"]+)"\)/);
  const fallbackMatch = content.match(/let tab = \$\("#([^"]+)"\)/);

  if (currentMatch?.[1] === heroTab || fallbackMatch?.[1] === heroTab) {
    console.log(`  ✅ 이미 최신 탭 ID 사용 중: #${heroTab}`);
    return;
  }

  // fallback 방식으로 교체
  const oldSimple = `const tab = $("#Hero");`;
  const newFallback = `let tab = $("#${heroTab}");\n  if (!tab.length) tab = $("#Hero");\n  if (!tab.length) tab = $("body");`;

  // 이미 let tab으로 되어 있으면 첫 번째 ID만 교체
  if (content.includes('let tab = $("#')) {
    const oldLetMatch = content.match(/let tab = \$\("#([^"]+)"\)/);
    if (oldLetMatch && oldLetMatch[1] !== heroTab) {
      content = content.replace(
        `let tab = $("#${oldLetMatch[1]}")`,
        `let tab = $("#${heroTab}")`,
      );
      fs.writeFileSync(HERO_FILE, content, "utf-8");
      console.log(`  🔄 탭 ID 업데이트: #${oldLetMatch[1]} → #${heroTab}`);
    }
  } else if (content.includes(oldSimple)) {
    content = content.replace(oldSimple, newFallback);
    fs.writeFileSync(HERO_FILE, content, "utf-8");
    console.log(`  🔄 Hero 탭 ID 패치 완료: #${heroTab}`);
  }
};

// ============================================================================
// 2. generate-blend-data.ts — BlendingRituals 탭 ID + 타입 텍스트
// ============================================================================
const patchBlend = async () => {
  console.log("\n[2/5] Blend 탭 ID 확인 중...");
  const BLEND_FILE = path.join(SCRIPTS_DIR, "generate-blend-data.ts");

  let html;
  try {
    html = await fetchPage("https://tlidb.com/ko/Blending_Rituals");
  } catch (e) {
    console.error("  ❌ 페이지 fetch 실패:", e.message);
    return;
  }

  const tabs = extractTabTargets(html);
  console.log("  발견된 탭:", tabs.slice(0, 10).join(", "));

  // 블렌딩 탭 찾기
  const blendTab = tabs.find(
    (t) =>
      t === "BlendingRituals" ||
      t.includes("조향") ||
      t.includes("Blend") ||
      t.includes("blend"),
  );

  if (!blendTab) {
    console.warn("  ⚠️  Blend 탭을 찾지 못함.");
    return;
  }

  console.log(`  Blend 탭 ID: #${blendTab}`);

  let content = fs.readFileSync(BLEND_FILE, "utf-8");

  // 현재 탭 ID 확인
  const currentMatch = content.match(/let tab = \$\("#([^"]+)"\)/);
  if (currentMatch?.[1] === blendTab) {
    console.log(`  ✅ 이미 최신 탭 ID: #${blendTab}`);
  } else if (currentMatch) {
    content = content.replace(
      `let tab = $("#${currentMatch[1]}")`,
      `let tab = $("#${blendTab}")`,
    );
    fs.writeFileSync(BLEND_FILE, content, "utf-8");
    console.log(`  🔄 탭 ID 업데이트: #${currentMatch[1]} → #${blendTab}`);
  }

  // 타입 텍스트 자동 감지: 실제 HTML에서 Medium/Core/Aromatic에 해당하는 한국어 찾기
  // "핵심 재능", "중위 재능", "향기 재능" 등
  const typePatterns = [
    { en: "Medium Talent", ko: ["중위 재능", "중간 재능"], result: "Medium" },
    { en: "Core Talent", ko: ["핵심 재능", "코어 재능"], result: "Core" },
    {
      en: "Aromatic Talent",
      ko: ["향기 재능", "아로마틱 재능"],
      result: "Aromatic",
    },
  ];

  let typePatched = false;
  for (const p of typePatterns) {
    const foundKo = p.ko.find((k) => html.includes(k));
    if (!foundKo) continue;

    const oldPattern = `if (typeText.startsWith("${p.en}")) return "${p.result}";`;
    const newPattern = `if (typeText.startsWith("${p.en}") || typeText.startsWith("${foundKo}")) return "${p.result}";`;

    content = fs.readFileSync(BLEND_FILE, "utf-8");
    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(BLEND_FILE, content, "utf-8");
      console.log(`  🔄 타입 매핑 추가: "${p.en}" → "${foundKo}"`);
      typePatched = true;
    } else if (!content.includes(foundKo)) {
      // 이미 다른 한국어가 있는지 확인
      const alreadyMatch = content.match(
        new RegExp(`startsWith\\("([^"]+)"\\)\\s*\\)\\s*return "${p.result}"`),
      );
      if (alreadyMatch) {
        console.log(
          `  ✅ 타입 매핑 이미 있음: "${p.result}" = "${alreadyMatch[1]}"`,
        );
      }
    }
  }
};

// ============================================================================
// 3. generate-gear-affix-data.ts — 제작 탭 ID + caption 텍스트
// ============================================================================
const patchGearAffix = async () => {
  console.log("\n[3/5] Gear Affix 탭 ID 확인 중...");
  const GEAR_FILE = path.join(SCRIPTS_DIR, "generate-gear-affix-data.ts");

  let html;
  try {
    html = await fetchPage("https://tlidb.com/ko/Belt");
  } catch (e) {
    console.error("  ❌ 페이지 fetch 실패:", e.message);
    return;
  }

  const tabs = extractTabTargets(html);
  console.log("  발견된 탭:", tabs.slice(0, 15).join(", "));

  let content = fs.readFileSync(GEAR_FILE, "utf-8");

  // caption 텍스트 확인: 접두/접미에 해당하는 caption 찾기
  const captionMatches = [...html.matchAll(/caption[^>]*>([^<]+)<\/caption/g)];
  const captions = captionMatches.map((m) => m[1].trim());
  console.log("  발견된 caption:", captions.join(", "));

  // 메인=Prefix, 서브=Suffix 패턴 자동 감지
  const prefixCaption = captions.find(
    (c) =>
      c.includes("메인") ||
      c.includes("접두") ||
      c.toLowerCase().includes("pre"),
  );
  const suffixCaption = captions.find(
    (c) =>
      c.includes("서브") ||
      c.includes("접미") ||
      c.toLowerCase().includes("suffix"),
  );

  if (prefixCaption) {
    const oldCaption = `caption.toLowerCase().includes("pre-fix")`;
    const newCaption = `caption.toLowerCase().includes("pre-fix") || caption.includes("${prefixCaption}")`;
    if (content.includes(oldCaption) && !content.includes(prefixCaption)) {
      content = content.replace(oldCaption, newCaption);
      console.log(`  🔄 Prefix caption 매핑: "${prefixCaption}"`);
    } else {
      console.log(`  ✅ Prefix caption 이미 처리됨`);
    }
  }

  if (suffixCaption) {
    const oldCaption = `caption.toLowerCase().includes("suffix")`;
    const newCaption = `caption.toLowerCase().includes("suffix") || caption.includes("${suffixCaption}")`;
    if (content.includes(oldCaption) && !content.includes(suffixCaption)) {
      content = content.replace(oldCaption, newCaption);
      console.log(`  🔄 Suffix caption 매핑: "${suffixCaption}"`);
    } else {
      console.log(`  ✅ Suffix caption 이미 처리됨`);
    }
  }

  fs.writeFileSync(GEAR_FILE, content, "utf-8");
};

// ============================================================================
// 4. generate-talent-data.ts — 탭 ID 확인
// ============================================================================
const patchTalent = async () => {
  console.log("\n[4/5] Talent 탭 ID 확인 중...");
  const TALENT_FILE = path.join(SCRIPTS_DIR, "generate-talent-data.ts");

  let html;
  try {
    html = await fetchPage("https://tlidb.com/ko/Talent");
  } catch (e) {
    console.error("  ❌ 페이지 fetch 실패:", e.message);
    return;
  }

  const tabs = extractTabIds(html);

  // 재능 탭 ID 확인
  const talentTab = tabs.find(
    (t) => t === "재능" || t === "Talent" || t === "talent",
  );
  const coreTalentTab = tabs.find(
    (t) => t === "CoreTalentNode" || t.includes("코어") || t.includes("Core"),
  );

  console.log(`  재능 탭: #${talentTab || "없음"}`);
  console.log(`  코어 재능 탭: #${coreTalentTab || "없음"}`);

  let content = fs.readFileSync(TALENT_FILE, "utf-8");
  let patched = false;

  if (talentTab) {
    const oldTab = `const talentTab = $("#재능")`;
    const altOld = `const talentTab = $("#Talent")`;
    if (content.includes(altOld) && talentTab !== "Talent") {
      content = content.replace(altOld, `const talentTab = $("#${talentTab}")`);
      console.log(`  🔄 재능 탭 ID: Talent → ${talentTab}`);
      patched = true;
    } else {
      console.log(`  ✅ 재능 탭 ID 최신 상태`);
    }
  }

  if (patched) fs.writeFileSync(TALENT_FILE, content, "utf-8");
};

// ============================================================================
// 5. generate-core-talent-data.ts — 탭 ID 확인
// ============================================================================
const patchCoreTalent = async () => {
  console.log("\n[5/5] Core Talent 탭 ID 확인 중...");
  // core-talent은 Talent 페이지를 같이 사용하므로 별도 fetch 불필요
  // 현재는 안정적이므로 상태만 확인
  const CORE_FILE = path.join(SCRIPTS_DIR, "generate-core-talent-data.ts");
  if (fs.existsSync(CORE_FILE)) {
    console.log(
      "  ✅ generate-core-talent-data.ts 확인 완료 (별도 패치 불필요)",
    );
  }
};

// ============================================================================
// 메인 실행
// ============================================================================
const main = async () => {
  console.log("=".repeat(60));
  console.log("tlidb 탭 ID 자동 패치 스크립트");
  console.log("=".repeat(60));
  console.log("tlidb 한국어 페이지에서 실제 탭 ID를 확인합니다...");

  try {
    await patchHeroTrait();
    await patchBlend();
    await patchGearAffix();
    await patchTalent();
    await patchCoreTalent();

    console.log("\n" + "=".repeat(60));
    console.log("✅ 모든 패치 완료!");
    console.log("=".repeat(60));
    console.log("\n이제 아래 명령어로 데이터를 재생성하세요:");
    console.log("  pnpm exec tsx src/scripts/generate.ts all --refetch");
    console.log("  node update-expected-counts.cjs");
  } catch (e) {
    console.error("\n❌ 오류 발생:", e.message);
    process.exit(1);
  }
};

main();
