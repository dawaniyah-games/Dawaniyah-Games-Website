/**
 * Central WhatsApp click-to-chat configuration.
 *
 * phoneNumber – E.164 format WITHOUT the leading '+'.
 * Saudi number +966 0551194463 → drop the leading local 0 → 966551194463
 */
export const WHATSAPP_CONFIG = {
  phoneNumber: '4915229018095',
} as const;

/**
 * Builds a wa.me click-to-chat URL.
 *
 * @param message - Optional pre-filled message (will be URI-encoded).
 * @returns Full wa.me URL string.
 */
export function buildWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Analytics placeholder – replace with your real tracker (GA4, Mixpanel, etc.)
 */
export function trackWhatsAppClick(message: string): void {
  // eslint-disable-next-line no-console
  console.log('[WhatsApp] click-to-chat opened', { phone: WHATSAPP_CONFIG.phoneNumber, message });
}
