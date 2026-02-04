import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const LANGS = [
  { code: "en", label: "EN", nameKey: "common.english" },
  { code: "ar", label: "AR", nameKey: "common.arabic" },
] as const;

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-200 hover:text-white hover:border-[#D4AF37]/40 transition-colors font-['Josefin_Sans'] uppercase tracking-widest"
          aria-label={t("common.language")}
        >
          <span>{current.label}</span>
          <Globe size={16} className="text-[#D4AF37]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#100425] border border-white/10 text-white min-w-[170px]"
      >
        {LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => void i18n.changeLanguage(lang.code)}
            className="cursor-pointer focus:bg-white/10"
          >
            <span className="font-['Josefin_Sans'] font-bold">{lang.label}</span>
            <span className="ml-auto text-sm text-gray-300 [html[dir='rtl']_&]:mr-auto [html[dir='rtl']_&]:ml-0">{t(lang.nameKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
