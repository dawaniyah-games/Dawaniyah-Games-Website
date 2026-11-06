import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { acceptSound, closeSoundPrompt, isSoundPromptOpen, subscribeSoundPrompt } from '../../audio/soundStore';
import { isBirdOnPrompt, leavePrompt, setPromptPerch, subscribeBirdOnPrompt } from '../sections/bird/birdPrompt';

/** Long enough for the bird to lift off the card before the card has gone. */
const LEAVE_MS = 700;

/**
 * For visitors whose browser will not start sound by itself: one tap, anywhere, is all it needs. The
 * real bird stands on the card and flies down to the island as it fades. The mute button is the way
 * out of the sound. A scroll closes it too, but the browser does not count one, so the sound waits.
 */
export function SoundPrompt() {
  const { t } = useTranslation();
  const open = useSyncExternalStore(subscribeSoundPrompt, isSoundPromptOpen);
  const birdOnCard = useSyncExternalStore(subscribeBirdOnPrompt, isBirdOnPrompt);
  const [leaving, setLeaving] = useState(false);
  const perchRef = useRef<HTMLSpanElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const leavingRef = useRef(false);

  const leave = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    leavePrompt();
    window.setTimeout(closeSoundPrompt, LEAVE_MS);
  };
  const accept = () => {
    if (!leavingRef.current) acceptSound();
    leave();
  };

  useEffect(() => {
    if (!open) return;
    setPromptPerch(perchRef.current);
    okRef.current?.focus({ preventScroll: true });
    window.addEventListener('keydown', accept);
    window.addEventListener('scroll', leave, { passive: true });
    return () => {
      window.removeEventListener('keydown', accept);
      window.removeEventListener('scroll', leave);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`sound-prompt ${leaving ? 'is-leaving' : ''}`} onClick={accept}>
      <div className="sound-prompt-card" role="dialog" aria-modal="true" aria-labelledby="sound-prompt-title" aria-describedby="sound-prompt-text">
        <span ref={perchRef} className="sound-prompt-perch" />
        {!birdOnCard && <span className="sound-prompt-bird" aria-hidden="true" />}
        <h2 id="sound-prompt-title" className="t-h3">
          {t('nav.soundPromptTitle')}
        </h2>
        <p id="sound-prompt-text" className="t-body mt-2">
          {t('nav.soundPromptText')}
        </p>
        <div className="sound-prompt-actions">
          <button ref={okRef} type="button" className="btn btn-saffron t-button">
            {t('nav.soundPromptOk')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
