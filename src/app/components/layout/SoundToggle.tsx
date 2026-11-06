import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isSoundOn, subscribeSound, subscribeSoundPulse, toggleSound } from '../../audio/soundStore';

export function SoundToggle() {
  const { t } = useTranslation();
  const on = useSyncExternalStore(subscribeSound, isSoundOn);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      subscribeSoundPulse(() => {
        buttonRef.current?.classList.add('sound-toggle-pulse');
      }),
    [],
  );

  const Icon = on ? Volume2 : VolumeX;
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleSound}
      onAnimationEnd={(event) => event.currentTarget.classList.remove('sound-toggle-pulse')}
      aria-pressed={on}
      aria-label={t(on ? 'nav.soundOff' : 'nav.soundOn')}
      className="sound-toggle relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-night hover:text-majlis transition-colors cursor-pointer"
    >
      <Icon aria-hidden="true" size={20} />
    </button>
  );
}
