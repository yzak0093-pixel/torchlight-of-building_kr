import { i18n, type Messages } from "@lingui/core";

// 1. 시스템이 'ko'를 정식 언어로 완벽하게 인식하도록 타입 추가
export type Locale = "en" | "zh" | "ko";

const modules = ["common", "legendaries", "talents", "skills", "hero"] as const;

async function loadMessages(locale: Locale): Promise<Messages> {
  const allMessages: Messages = {};

  await Promise.all(
    modules.map(async (module) => {
      try {
        const mod = await import(`../locales/${locale}/${module}.ts`);
        if (mod.messages) {
          Object.assign(allMessages, mod.messages);
        }
      } catch (e) {
        console.warn(`[i18n] Failed to load ${locale}/${module}.ts:`, e);
      }
    }),
  );
  return allMessages;
}

// 'ko' 캐시 공간 추가
const messageCache: Record<Locale, Messages | null> = { en: null, zh: null, ko: null };

// 2. 기본 언어를 무조건 한국어로 강제 설정
export const defaultLocale: Locale = "ko";

// 3. 드롭다운 메뉴에서 영어, 중문 완전 삭제 (UI에 한국어만 남음)
export const SUPPORTED_LOCALES = [
  { locale: "ko" as const, name: "한국어" },
] as const;

export const loadLocale = async (locale: Locale): Promise<void> => {
  let messages = messageCache[locale];
  if (!messages) {
    messages = await loadMessages(locale);
    messageCache[locale] = messages;
  }
  i18n.load(locale, messages);
  i18n.activate(locale);
};

// 4. 로컬 스토리지나 브라우저 환경을 무시하고 무조건 한국어만 반환하도록 차단
export const getStoredLocale = (): Locale => {
  return defaultLocale; 
};

export const detectBrowserLocale = (): Locale => {
  return defaultLocale;
};

export const setStoredLocale = async (locale: Locale): Promise<void> => {
  localStorage.setItem("locale", "ko");
  await loadLocale("ko");
};

// 5. 사이트 접속 시 초기화를 무조건 한국어로 실행
const initialLocale = defaultLocale;
if (typeof window !== "undefined") {
  localStorage.setItem("locale", initialLocale);
}

await loadLocale(initialLocale);

if (typeof window !== "undefined") {
  (window as unknown as { setLocale: typeof setStoredLocale }).setLocale =
    setStoredLocale;
}

export { i18n };
