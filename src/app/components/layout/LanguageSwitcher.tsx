import React from "react";
import { useTranslation } from "react-i18next";
import { ensureLanguageResources } from '../../i18n';

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
          className="t-nav inline-flex shrink-0 items-center gap-1 text-night hover:text-majlis transition-colors cursor-pointer"
          aria-label={t("common.language")}
        >
          <span>{current.label}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-ivory border border-night/10 text-night min-w-[170px]"
      >
        {LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() =>
              void ensureLanguageResources(lang.code).then(() => i18n.changeLanguage(lang.code))
            }
            className="cursor-pointer focus:bg-night/8"
          >
            <span className="font-semibold">{lang.label}</span>
            <span className="ml-auto text-sm text-night/70 [html[dir='rtl']_&]:mr-auto [html[dir='rtl']_&]:ml-0">{t(lang.nameKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
