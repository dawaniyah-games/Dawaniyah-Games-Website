import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { EASE_SMOOTH, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import char01Img from '../../../assets/Char_01.png';
import char03Img from '../../../assets/Char_03.png';
import gun01Img from '../../../assets/Gun_01.png';

export function GameAssets() {
  const { t } = useTranslation();

  const characterImages = [
    { src: char01Img, alt: 'Character 01', kind: 'char' as const },
    { src: char03Img, alt: 'Character 03', kind: 'char' as const },
  ];

  const gunImage = { src: gun01Img, alt: 'Gun 01', kind: 'gun' as const };

  const videos = [
    {
      src: 'https://cdn.artstation.com/p/video_sources/003/089/367/midshot.mp4',
      label: t('assets.videos.midshot'),
    },
    {
      src: 'https://cdn.artstation.com/p/video_sources/003/089/368/b.mp4',
      label: t('assets.videos.b'),
    },
    {
      src: 'https://cdn.artstation.com/p/video_sources/003/090/417/marmoset.mp4',
      label: t('assets.videos.marmoset'),
    },
  ];

  return (
    <motion.section
      id="game-assets"
      className="pt-24 pb-0 bg-[#100425] relative"
      initial={{ opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 64 }}
      transition={{ duration: 0.8, ease: EASE_SMOOTH }}
      viewport={{ once: false, amount: 0.25 }}
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-0"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            <span className="text-[#D4AF37]">{t('assets.heading')}</span>
          </h2>
          <p className="text-gray-400 max-w-4xl mx-auto whitespace-pre-line">
            {t('assets.subheading')}
          </p>
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.04)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10 mb-6"
        >
          {characterImages.map((img) => (
            <motion.div
              key={img.alt}
              variants={fadeUp}
              className="relative pointer-events-none select-none"
            >
              <div className="relative overflow-visible">
                <div
                  className={
                    'h-[130px] sm:h-[140px] md:h-[160px] lg:h-[170px]'
                  }
                />

                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-[80%] bg-[#0B021C]" />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[80%] opacity-25"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 100%, rgba(220,0,211,0.22) 0%, transparent 70%)',
                    }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[80%] opacity-90"
                    style={{
                      background:
                        'linear-gradient(to top, #0B021C 0%, #0B021C 55%, transparent 100%)',
                    }}
                  />
                  <div
                    className={
                      'h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]'
                    }
                  />
                </div>

                <div
                  className={
                    'absolute left-1/2 -translate-x-1/2 -top-28 sm:-top-32 md:-top-36 lg:-top-40 w-[96%] z-10'
                  }
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[460px] sm:h-[500px] md:h-[580px] lg:h-[620px] object-contain object-bottom drop-shadow-2xl"
                  />

                  <div
                    className="absolute inset-x-0 bottom-0 h-24 sm:h-28 md:h-32 flex items-end justify-center pb-2 sm:pb-3 text-xs text-gray-300 tracking-wide"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(11,2,28,1) 0%, rgba(11,2,28,0.65) 45%, rgba(11,2,28,0) 100%)',
                    }}
                  >
                    by Sherif Amer
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.04)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {videos.map((video) => (
            <motion.div
              key={video.src}
              variants={fadeUp}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.35, ease: EASE_SMOOTH, type: 'tween' }}
              className="group relative rounded-2xl bg-[#0B021C] border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden"
            >
              <div className="w-full aspect-[16/9] bg-black">
                <video
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                >
                  <source src={video.src} type="video/mp4" />
                </video>
              </div>
              <div className="px-6 py-5">
                <div className="text-sm text-gray-300 font-medium">{video.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="mt-16 relative pointer-events-none select-none"
        >
          <div className="relative overflow-visible">
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0B021C]" />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-25"
                style={{
                  background:
                    'radial-gradient(circle at 50% 100%, rgba(220,0,211,0.22) 0%, transparent 70%)',
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-90"
                style={{
                  background:
                    'linear-gradient(to top, #0B021C 0%, #0B021C 55%, transparent 100%)',
                }}
              />
              <div className="h-[180px] sm:h-[200px] md:h-[220px] lg:h-[240px]" />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-8 md:-top-10 lg:-top-12 w-[98%]">
              <img
                src={gunImage.src}
                alt={gunImage.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-[260px] sm:h-[280px] md:h-[320px] lg:h-[340px] object-contain"
              />
            </div>

            <div className="h-[96px] sm:h-[110px] md:h-[140px] lg:h-[160px]" />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
