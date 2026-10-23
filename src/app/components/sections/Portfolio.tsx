import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import imgNew1 from "../../../assets/project-dendon-games.jpg";
import imgNew2 from "../../../assets/project-khuzama-games.jpg";
import imgUiFramework from "../../../assets/Uiframework_promo.jpg";
import imgNew1WebpSrcSet from "../../../assets/project-dendon-games.jpg?w=320;480;640;768&format=webp&as=srcset";
import imgNew2WebpSrcSet from "../../../assets/project-khuzama-games.jpg?w=320;480;640;768&format=webp&as=srcset";
import imgUiFrameworkWebpSrcSet from "../../../assets/Uiframework_promo.jpg?w=320;480;640;768&format=webp&as=srcset";
// import imgWallary from "../../../assets/wallary.png";
// import imgWallaryWebpSrcSet from "../../../assets/wallary.png?w=320;480;640;768&format=webp&as=srcset";
import { fadeLeft, fadeScale, stagger, VIEWPORT_ONCE } from '../../motion/presets';
import { useTranslation } from 'react-i18next';

export function Portfolio() {
  const { t } = useTranslation();

  const projects = [
    {
      title: t('portfolio.projects.dendon.title'),
      category: t('portfolio.projects.dendon.category'),
      image: imgNew1,
      webpSrcSet: imgNew1WebpSrcSet,
      tools: [t('portfolio.tools.unity'), t('portfolio.tools.voiceChat'), t('portfolio.tools.multiplayer')],
    },
    {
      title: t('portfolio.projects.khuzama.title'),
      category: t('portfolio.projects.khuzama.category'),
      image: imgNew2,
      webpSrcSet: imgNew2WebpSrcSet,
      tools: [t('portfolio.tools.unity'), t('portfolio.tools.voiceChat'), t('portfolio.tools.multiplayer')],
    },
    // {
    //   title: t('portfolio.projects.wallary.title'),
    //   category: t('portfolio.projects.wallary.category'),
    //   image: imgWallary,
    //   webpSrcSet: imgWallaryWebpSrcSet,
    //   linkUrl: 'https://www.wallary.app/',
    //   linkLabel: t('portfolio.actions.visitWebsite'),
    //   tools: ['ARKit', 'iOS', 'Interior Design'],
    // },
    {
      title: "UiFramework Open Source",
      category: "",
      image: imgUiFramework,
      webpSrcSet: imgUiFrameworkWebpSrcSet,
      linkUrl: `${import.meta.env.BASE_URL}uiframework/`,
      linkLabel: t('portfolio.actions.viewDocs'),
      tools: ["Open Source"],
    },
  ];

  return (
    <section
      className="pt-8 pb-24 bg-[#100425] relative"
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
              <span className="text-[#D4AF37]">{t('portfolio.heading')}</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t('portfolio.subheading')}</p>
          </motion.div>
          
          {/* View Full Portfolio button removed as requested */}
        </div>

        <motion.div
          variants={stagger(0.12, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="flex flex-wrap justify-center gap-16"
        >
          {projects.map((project, index) => (
            <div key={project.title} className="flex flex-col items-center">
              {project.linkUrl ? (
                <a
                  href={project.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative max-w-[340px] aspect-[1024/1379] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
                  style={{ textDecoration: "none" }}
                >
                  <motion.div
                    variants={fadeScale}
                  >
                    <div className="relative w-full h-full flex flex-col">
                      <picture>
                        {project.webpSrcSet && (
                          <source
                            type="image/webp"
                            srcSet={project.webpSrcSet}
                            sizes="(max-width: 420px) 90vw, 340px"
                          />
                        )}
                        <img
                          src={project.image}
                          alt={project.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </picture>
                      <div className="absolute inset-0 bg-black pointer-events-none rounded-2xl opacity-30 group-hover:opacity-10 transition-opacity duration-300" />
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8 [html[dir='rtl']_&]:text-right">
                      <h3 className="text-2xl font-bold text-white mb-2 font-['Josefin_Sans']">{project.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tools.map((tool) => (
                          <span key={tool} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/10">
                            {tool}
                          </span>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-2 text-[#FFD700] text-sm font-bold mt-2">
                        {project.linkLabel} <ExternalLink size={16} />
                      </span>
                    </div>
                  </motion.div>
                </a>
              ) : (
                <motion.div
                  variants={fadeScale}
                  className="group relative max-w-[340px] aspect-[1024/1379] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
                >
                  <div className="relative w-full h-full flex flex-col">
                    <picture>
                      {project.webpSrcSet && (
                        <source
                          type="image/webp"
                          srcSet={project.webpSrcSet}
                          sizes="(max-width: 420px) 90vw, 340px"
                        />
                      )}
                      <img
                        src={project.image}
                        alt={project.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </picture>
                    <div className="absolute inset-0 bg-black pointer-events-none rounded-2xl opacity-30 group-hover:opacity-10 transition-opacity duration-300" />
                    {/* Badge top-right */}
                    <div className="absolute top-3 left-3 z-20 [html[dir='rtl']_&]:left-auto [html[dir='rtl']_&]:right-3">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#DC00D3] via-[#D4AF37] to-[#DC00D3] text-white text-xs font-bold shadow-lg tracking-widest animate-pulse uppercase drop-shadow-lg border border-white/20">
                        {t('portfolio.comingSoon')}
                      </span>
                    </div>
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8 [html[dir='rtl']_&]:text-right">
                    <h3 className="text-2xl font-bold text-white mb-2 font-['Josefin_Sans']">{project.title}</h3>
                    {project.category && (
                      <p className="text-[#D4AF37] mb-4">{project.category}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tools.map((tool) => (
                        <span key={tool} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/10">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
