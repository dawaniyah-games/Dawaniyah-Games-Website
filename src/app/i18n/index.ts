import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import ar from "./locales/ar";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

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

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
    pluralSeparator: "_",
  });

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
