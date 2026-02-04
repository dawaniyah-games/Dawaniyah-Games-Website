import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { ExternalLink } from 'lucide-react';
import imgNew1 from "../../../assets/project-dendon-games.jpg";
import imgNew2 from "../../../assets/project-khuzama-games.png";
import { EASE_SMOOTH, fadeLeft, fadeRight, fadeScale, stagger, VIEWPORT_ONCE } from '../../motion/presets';

const projects = [
  {
    title: "Dendon Games",
    category: "Social Board Games",
    image: imgNew1,
    tools: ["Unity", "Voice Chat", "Multiplayer"],
  },
  {
    title: "Khuzama Games",
    category: "Puzzle & Strategy",
    image: imgNew2,
    tools: ["Unity", "Voice Chat", "Multiplayer"],
  }
];

export function Portfolio() {
  const [hasPlayedFirstIntro, setHasPlayedFirstIntro] = React.useState(false);

  return (
    <motion.section
      id="portfolio"
      className="py-24 bg-[#100425] relative"
      initial={{ opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 64 }}
      onAnimationComplete={() => {
        if (!hasPlayedFirstIntro) setHasPlayedFirstIntro(true);
      }}
      transition={{
        duration: hasPlayedFirstIntro ? 0.8 : 1.15,
        delay: hasPlayedFirstIntro ? 0 : 0.12,
        ease: EASE_SMOOTH,
      }}
      viewport={{ once: false, amount: 0.3 }}
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
              FEATURED <span className="text-[#D4AF37]">PROJECTS</span>
            </h2>
            <p className="text-gray-400">A glimpse into the worlds we've built.</p>
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
            <div className="flex flex-col items-center">
              <motion.div
                key={index}
                variants={fadeScale}
                className="group relative max-w-[340px] aspect-[1024/1379] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
              >
                <div className="relative w-full h-full flex flex-col">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black pointer-events-none rounded-2xl opacity-30 group-hover:opacity-10 transition-opacity duration-300" />
                  {/* Coming Soon badge top-right */}
                  <div className="absolute top-3 left-3 z-20">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#DC00D3] via-[#D4AF37] to-[#DC00D3] text-white text-xs font-bold shadow-lg tracking-widest animate-pulse uppercase drop-shadow-lg border border-white/20">
                      Coming Soon
                    </span>
                  </div>
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                  <h3 className="text-2xl font-bold text-white mb-2 font-['Josefin_Sans']">{project.title}</h3>
                  <p className="text-[#D4AF37] mb-4">{project.category}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tools.map((tool) => (
                      <span key={tool} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/10">
                        {tool}
                      </span>
                    ))}
                  </div>
                  {/* View Details removed as requested */}
                </div>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
