import React from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, Globe, Zap, Lightbulb, Linkedin } from 'lucide-react';
import { SiBehance, SiArtstation } from 'react-icons/si';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import profileImg from "../../../assets/profile.jpg";
import ahmedImg from "../../../assets/Ahmed.jpg";
import abdulrahmanImg from "../../../assets/Abdulrahman.jpg";
import monaImg from "../../../assets/Mona.jpg";
import phillImg from "../../../assets/Phill_img.jpg";
import sabrinaImg from "../../../assets/Sabrina_img.jpg";
import sherifImg from "../../../assets/Sherif.jpg";
import { EASE_SMOOTH, fadeUp, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../ui/use-mobile';

const founderImageAnim = {
  hidden: { opacity: 0, x: -120 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE_SMOOTH } },
  exit: { opacity: 0, x: -120, transition: { duration: 0.7, ease: EASE_SMOOTH } }
} as const;
const founderTextAnim = {
  hidden: { opacity: 0, x: 120 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE_SMOOTH } },
  exit: { opacity: 0, x: 120, transition: { duration: 0.7, ease: EASE_SMOOTH } }
} as const;

export function About() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const TEAM_PREVIEW_COUNT = 3;
  const [isExpanded, setIsExpanded] = React.useState(false);

  const viewportOnce = React.useMemo(
    () => ({
      ...VIEWPORT_ONCE,
      amount: isMobile ? 0.12 : VIEWPORT_ONCE.amount,
    }),
    [isMobile],
  );

  React.useEffect(() => {
    if (isMobile) setIsExpanded(false);
  }, [isMobile]);
  const stats = [
    { label: t('about.stats.years'), value: "14+", icon: BadgeCheck },
    { label: t('about.stats.global'), value: t('about.stats.international'), icon: Globe },
    { label: t('about.stats.scaled'), value: t('about.stats.highPerf'), icon: Zap },
    { label: t('about.stats.vision'), value: t('about.stats.innovative'), icon: Lightbulb },
  ];
  const ahmedStats = [
    { label: t('about.ahmedStats.yearsLabel'), value: t('about.ahmedStats.yearsValue'), icon: BadgeCheck },
    { label: t('about.ahmedStats.ksaLabel'), value: t('about.ahmedStats.ksaValue'), icon: Globe },
    { label: t('about.ahmedStats.innovativeLabel'), value: t('about.ahmedStats.innovativeValue'), icon: Lightbulb },
    { label: t('about.ahmedStats.highPerfLabel'), value: t('about.ahmedStats.highPerfValue'), icon: Zap },
  ];
  const monaStats = [
    { label: t('about.monaStats.yearsLabel'), value: t('about.monaStats.yearsValue'), icon: BadgeCheck },
    { label: t('about.monaStats.innovativeLabel'), value: t('about.monaStats.innovativeValue'), icon: Lightbulb },
    { label: t('about.monaStats.creativeLabel'), value: t('about.monaStats.creativeValue'), icon: Zap },
  ];
  const phillipStats = [
    { label: t('about.phillipStats.gameplayLabel'), value: t('about.phillipStats.gameplayValue'), icon: Zap },
    { label: t('about.phillipStats.interactiveLabel'), value: t('about.phillipStats.interactiveValue'), icon: Lightbulb },
    { label: t('about.phillipStats.scalableLabel'), value: t('about.phillipStats.scalableValue'), icon: BadgeCheck },
  ];
  const sabrinaStats = [
    { label: t('about.sabrinaStats.innovativeLabel'), value: t('about.sabrinaStats.innovativeValue'), icon: Lightbulb },
    { label: t('about.sabrinaStats.detailLabel'), value: t('about.sabrinaStats.detailValue'), icon: BadgeCheck },
    { label: t('about.sabrinaStats.playerLabel'), value: t('about.sabrinaStats.playerValue'), icon: Zap },
  ];
  const sherifStats = [
    { label: t('about.sherifStats.experienceLabel'), value: t('about.sherifStats.experienceValue'), icon: BadgeCheck },
    { label: t('about.sherifStats.aaaLabel'), value: t('about.sherifStats.aaaValue'), icon: Globe },
    { label: t('about.sherifStats.creativityLabel'), value: t('about.sherifStats.creativityValue'), icon: Lightbulb },
  ];

  const teamCards = [
    /* Mohamed */
    (
      <motion.div
        key="mohamed"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={profileImg}
                  alt={t('about.name')}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-[50%_12%] scale-100 brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:scale-105 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-4">{t('about.name')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.mohamedRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.mohamedLocation')}</span>
              </h4>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('about.p1')}</p>
              <p className="text-gray-300 leading-relaxed">{t('about.p2')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end mb-6"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className="flex items-center gap-3 justify-start"
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex gap-3 flex-wrap [html[dir='rtl']_&]:flex-row-reverse">
                <a
                  href="https://www.linkedin.com/in/mohamed-moghazi-9a729554/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
                >
                  <Linkedin size={18} />
                  {t('about.connect')}
                </a>
                <a
                  href="https://dawaniyah-games.github.io/my-cv/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#DC00D3]/10 hover:bg-[#DC00D3]/20 text-[#DC00D3] border border-[#DC00D3]/30 rounded-lg font-medium transition-colors"
                >
                  <BadgeCheck size={18} />
                  {t('about.viewCv')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Ahmed */
    (
      <motion.div
        key="ahmed"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={ahmedImg}
                  alt="Ahmed Naguib"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-[50%_20%] scale-100 brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:scale-105 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.ahmedName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.ahmedRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.ahmedLocation')}</span>
              </h4>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('about.ahmedP1')}</p>
              <p className="text-gray-300 leading-relaxed">{t('about.ahmedP2')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end"
              >
                {ahmedStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className="flex items-center gap-3 justify-start"
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex gap-3 flex-wrap mt-6 [html[dir='rtl']_&]:flex-row-reverse">
                <a
                  href="https://www.linkedin.com/in/ahmed-naguib-4392a4191/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
                >
                  <Linkedin size={18} />
                  {t('about.connect')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Abdulrahman */
    (
      <motion.div
        key="abdulrahman"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={abdulrahmanImg}
                  alt="Abdulrahman Alotaibi"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center scale-100 brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:scale-105 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.abdulrahmanName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.abdulrahmanRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.abdulrahmanLocation')}</span>
              </h4>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('about.abdulrahmanP1')}</p>
              <p className="text-gray-300 leading-relaxed">{t('about.abdulrahmanP2')}</p>
            </div>


            {/* Skills/Stats and LinkedIn aligned to bottom */}
            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end mb-6"
              >
                <motion.div variants={fadeUp} className="flex items-center gap-3 justify-start">
                  <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                    <BadgeCheck size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Business Development</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Skill</div>
                  </div>
                </motion.div>
                <motion.div variants={fadeUp} className="flex items-center gap-3 justify-start">
                  <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                    <Lightbulb size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Strategic Planning</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Skill</div>
                  </div>
                </motion.div>
              </motion.div>
              <div className="flex gap-3 flex-wrap [html[dir='rtl']_&]:flex-row-reverse">
                <a
                  href="https://www.linkedin.com/in/eng-abdulrahman-alotaibi-077083225/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
                >
                  <Linkedin size={18} />
                  {t('about.connect')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Mona */
    (
      <motion.div
        key="mona"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={monaImg}
                  alt="Mona Farraj"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.monaName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.monaRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.monaLocation')}</span>
              </h4>
              <p className="text-gray-300 leading-relaxed">{t('about.monaP1')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end"
              >
                {monaStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className={
                      (index === monaStats.length - 1 ? "col-span-2 justify-start " : '') +
                      "flex items-center gap-3 justify-start"
                    }
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex gap-3 flex-wrap mt-6 [html[dir='rtl']_&]:flex-row-reverse">
                <a
                  href="https://www.behance.net/monaleza"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
                >
                  <SiBehance className="w-[18px] h-[18px]" />
                  Behance
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Phillip */
    (
      <motion.div
        key="phillip"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={phillImg}
                  alt="Phillip"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.phillipName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.phillipRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.phillipLocation')}</span>
              </h4>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('about.phillipP1')}</p>
              <p className="text-gray-300 leading-relaxed">{t('about.phillipP2')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end"
              >
                {phillipStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className={
                      (index === phillipStats.length - 1 ? "col-span-2 justify-start " : '') +
                      "flex items-center gap-3 justify-start"
                    }
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Sherif */
    (
      <motion.div
        key="sherif"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={sherifImg}
                  alt="Sherif Amer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.sherifName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.sherifRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.sherifLocation')}</span>
              </h4>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('about.sherifP1')}</p>
              <p className="text-gray-300 leading-relaxed">{t('about.sherifP2')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end mb-6"
              >
                {sherifStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className={
                      (index === sherifStats.length - 1 ? "col-span-2 justify-start " : '') +
                      "flex items-center gap-3 justify-start"
                    }
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <div className="flex gap-3 flex-wrap [html[dir='rtl']_&]:flex-row-reverse">
                <a
                  href="https://www.linkedin.com/in/sherif-amer/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-lg font-medium transition-colors"
                >
                  <Linkedin size={18} />
                  {t('about.connect')}
                </a>
                <a
                  href="https://sheko.artstation.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#DC00D3]/10 hover:bg-[#DC00D3]/20 text-[#DC00D3] border border-[#DC00D3]/30 rounded-lg font-medium transition-colors"
                >
                  <SiArtstation className="w-[18px] h-[18px]" />
                  ArtStation
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),

    /* Sabrina */
    (
      <motion.div
        key="sabrina"
        variants={fadeUp}
        className="h-full rounded-2xl border border-[#DC00D3]/20 bg-[#100425] overflow-hidden shadow-[0_0_40px_rgba(220,0,211,0.18)]"
      >
        <div className="px-6 pt-5 pb-6 h-full flex flex-col">
          <div className="flex justify-center mt-8 mb-10">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#DC00D3] rotate-6 opacity-50"></div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-[#D4AF37] -rotate-6 opacity-50"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#DC00D3]/30">
                <ImageWithFallback
                  src={sabrinaImg}
                  alt="Sabrina"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center brightness-95 contrast-105 saturate-95 transition-all duration-700 hover:brightness-100 hover:saturate-100"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#100425_100%)] opacity-60 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col [html[dir='rtl']_&]:text-right">
            <div>
              <h3 className="text-xl text-[#D4AF37] font-semibold mb-2">{t('about.sabrinaName')}</h3>
              <h4 className="text-sm font-medium mb-4">
                <span className="block text-[#DC00D3]">{t('about.sabrinaRole')}</span>
                <span className="block text-[#D4AF37]">{t('about.sabrinaLocation')}</span>
              </h4>
              <p className="text-gray-300 leading-relaxed">{t('about.sabrinaP1')}</p>
            </div>

            <div className="mt-auto pt-6">
              <motion.div
                variants={stagger(0.06, 0.02)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-2 gap-4 items-end"
              >
                {sabrinaStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    className={
                      (index === sabrinaStats.length - 1 ? "col-span-2 justify-start " : '') +
                      "flex items-center gap-3 justify-start"
                    }
                  >
                    <div className="p-2 rounded-lg bg-[#DC00D3]/10 text-[#DC00D3]">
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{stat.value}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    ),
  ];

  return (
    <section id="about" className="py-20 bg-[#100425] relative">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-12 text-center">
          <span className="text-[#DC00D3]">{t('about.heading')}</span>
        </h2>

        <motion.div
          key={isMobile ? (isExpanded ? 'team-mobile-expanded' : 'team-mobile-collapsed') : 'team-desktop'}
          variants={stagger(isMobile ? 0.06 : 0.1, isMobile ? 0.02 : 0.04)}
          initial={isMobile && isExpanded ? 'show' : 'hidden'}
          animate={isMobile && isExpanded ? 'show' : undefined}
          whileInView={isMobile && isExpanded ? undefined : 'show'}
          viewport={isMobile && isExpanded ? undefined : viewportOnce}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {(!isMobile || isExpanded) ? teamCards : teamCards.slice(0, TEAM_PREVIEW_COUNT)}
        </motion.div>

        {isMobile && !isExpanded && teamCards.length > TEAM_PREVIEW_COUNT && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#DC00D3]/10 hover:bg-[#DC00D3]/20 text-[#DC00D3] border border-[#DC00D3]/30 rounded-lg font-medium transition-colors"
            >
              {t('about.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
