import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

async function loadTranslation(lang: SupportedLanguage) {
  switch (lang) {
    case 'en': {
      const mod = await import('./locales/en');
      return mod.default;
    }
    case 'ar': {
      const mod = await import('./locales/ar');
      return mod.default;
    }
  }
}

function normalizeSupportedLanguage(value: string | null | undefined): SupportedLanguage | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "en" || lower.startsWith("en-")) return "en";
  if (lower === "ar" || lower.startsWith("ar-")) return "ar";
  return null;
}

function getLanguageFromUrl(): SupportedLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    return normalizeSupportedLanguage(url.searchParams.get("lang"));
  } catch {
    return null;
  }
}

function setLanguageInUrl(lang: SupportedLanguage) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

function getInitialLanguage(): SupportedLanguage {
  const fromUrl = getLanguageFromUrl();
  if (fromUrl) return fromUrl;

  try {
    const saved = localStorage.getItem("lang");
    const normalizedSaved = normalizeSupportedLanguage(saved);
    if (normalizedSaved) return normalizedSaved;
  } catch {
    // ignore
  }

  const browser = (navigator.language || "en").toLowerCase();
  if (browser.startsWith("ar")) return "ar";
  return "en";
}

export function applyDocumentDirection(lang: string) {
  const isArabic = lang.startsWith("ar");
  document.documentElement.lang = isArabic ? "ar" : "en";
  document.documentElement.dir = isArabic ? "rtl" : "ltr";
}

const initialLang = getInitialLanguage();

export async function ensureLanguageResources(lang: string) {
  const normalized = normalizeSupportedLanguage(lang) ?? 'en';
  if (i18n.hasResourceBundle(normalized, 'translation')) return;

  const translation = await loadTranslation(normalized);
  i18n.addResourceBundle(normalized, 'translation', translation, true, true);
}

export const i18nReady = (async () => {
  // Always load English (fallback), then the initial language if it differs.
  const en = await loadTranslation('en');
  const resources: Record<string, { translation: any }> = {
    en: { translation: en },
  };
  if (initialLang === 'ar') {
    const ar = await loadTranslation('ar');
    resources.ar = { translation: ar };
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
      pluralSeparator: '_',
    });
})();

if (typeof document !== "undefined") {
  applyDocumentDirection(initialLang);
}

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("lang", lng);
  } catch {
    // ignore
  }
  const normalized = normalizeSupportedLanguage(lng) ?? "en";
  setLanguageInUrl(normalized);
  applyDocumentDirection(lng);
});

export default i18n;
