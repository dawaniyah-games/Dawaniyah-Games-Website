import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import ar from "./locales/ar";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ar") return saved;
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
  applyDocumentDirection(lng);
});

export default i18n;
