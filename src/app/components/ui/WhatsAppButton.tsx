import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildWhatsAppUrl, trackWhatsAppClick } from '../../config/whatsapp';
import logoIcon from '../../../assets/logo-icon.webp';

interface WhatsAppButtonProps {
  /** Override the default pre-filled message from i18n. */
  message?: string;
}

export function WhatsAppButton({ message }: WhatsAppButtonProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const resolvedMessage = message ?? t('whatsapp.defaultMessage');
  const ariaLabel = t('whatsapp.ariaLabel');

  const [bubbleVisible, setBubbleVisible] = useState(false);

  // Auto-show bubble after 3 s, only once per session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('wa_bubble_dismissed');
    if (dismissed) return;
    const timer = window.setTimeout(() => setBubbleVisible(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function openWhatsApp() {
    trackWhatsAppClick(resolvedMessage);
    const url = buildWhatsAppUrl(resolvedMessage);
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
    }
  }

  function handleMainClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openWhatsApp();
  }

  function handleDismiss(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setBubbleVisible(false);
    sessionStorage.setItem('wa_bubble_dismissed', '1');
  }

  const positionClass = isRtl ? 'left-6 right-auto' : 'right-6';

  return (
    <div className={`fixed bottom-6 z-50 ${positionClass}`}>
      {/* Relative anchor sized to the WA button so bubble can center over it */}
      <div className="relative w-[62px] h-[62px]">

        {/* Chat bubble — right-aligned with WA button (LTR) / left-aligned (RTL) */}
        <div
          aria-live="polite"
          className={`
            absolute bottom-[calc(100%+28px)] w-max
            ${isRtl ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right'}
            transition-all duration-300
            ${bubbleVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
          `}
        >
          <button
            type="button"
            onClick={openWhatsApp}
            className={`relative flex items-start gap-3 w-[307px] bg-white rounded-2xl shadow-xl shadow-black/30 p-4 cursor-pointer hover:shadow-2xl transition-shadow duration-200
              ${isRtl ? 'pl-10 pr-4 flex-row-reverse text-right' : 'pr-10 pl-4 text-left'}`}
            aria-label={ariaLabel}
          >
            {/* Avatar */}
            <img
              src={logoIcon}
              alt="Dawaniyah Games"
              className="w-11 h-11 rounded-full shrink-0 border-2 border-[#25D366] object-contain bg-[#100425] p-0.5"
            />

            {/* Text */}
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-[#25D366] uppercase tracking-wide truncate">
                {t('whatsapp.supportTeam')}
              </span>
              <span className="text-[14px] text-gray-700 leading-snug mt-0.5">
                {t('whatsapp.greeting')}
              </span>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('whatsapp.dismiss')}
              className={`absolute top-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors
                ${isRtl ? 'left-2' : 'right-2'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Tail — points at center of WA button (31px from the aligned edge) */}
            <span
              aria-hidden="true"
              className={`absolute -bottom-[10px] w-0 h-0
                border-l-[10px] border-l-transparent
                border-r-[10px] border-r-transparent
                border-t-[10px] border-t-white
                ${isRtl ? 'left-[21px]' : 'right-[21px]'}`}
            />
          </button>
        </div>

      {/* WhatsApp floating button — 10% bigger: 56px → ~62px, icon 28px → ~31px */}
      <a
        href={buildWhatsAppUrl(resolvedMessage)}
        onClick={handleMainClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        title={ariaLabel}
        className="
          relative flex items-center justify-center
          w-[62px] h-[62px] rounded-full
          bg-[#25D366] shadow-lg shadow-black/40
          hover:bg-[#20ba59] active:scale-95
          transition-all duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]
          group
        "
      >
        {/* Pulse ring */}
        <span
          aria-hidden="true"
          className="
            absolute inset-0 rounded-full
            bg-[#25D366] opacity-60
            animate-ping
            group-hover:opacity-0 transition-opacity
          "
        />

        {/* WhatsApp SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="relative w-[31px] h-[31px] text-white"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </a>

      </div>{/* end relative w-[62px] */}
    </div>
  );
}
