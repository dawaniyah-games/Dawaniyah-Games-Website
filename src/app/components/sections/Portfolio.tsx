import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { ExternalLink } from 'lucide-react';
import imgNew1 from "../../../assets/project-dendon-games.png";
import { fadeLeft, fadeRight, fadeScale, stagger, VIEWPORT_ONCE } from '../../motion/presets';

const projects = [
  {
    title: "Dendon Games",
    category: "Social Board Games",
    image: imgNew1,
    tools: ["Unity", "Voice Chat", "Multiplayer"],
  }
];

export function Portfolio() {
  return (
    <section id="portfolio" className="py-24 bg-[#100425] relative">
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
          
          <motion.div
            variants={fadeRight}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="mt-6 md:mt-0"
          >
            <Button variant="outline" className="border-[#DC00D3] text-[#DC00D3] hover:bg-[#DC00D3] hover:text-white" onClick={() => document.getElementById('gameplay-demos')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              View Full Portfolio
            </Button>
          </motion.div>
        </div>

        <motion.div
          variants={stagger(0.12, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {projects.map((project, index) => (
            <motion.div
              key={index}
              variants={fadeScale}
              className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer"
            >
              <img 
                src={project.image} 
                alt={project.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#100425] via-[#100425]/50 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                <h3 className="text-2xl font-bold text-white mb-2 font-['Josefin_Sans']">{project.title}</h3>
                <p className="text-[#D4AF37] mb-4">{project.category}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tools.map((tool) => (
                    <span key={tool} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/10">
                      {tool}
                    </span>
                  ))}
                </div>
                <div className="flex items-center text-white/80 hover:text-white font-semibold gap-2">
                  View Details <ExternalLink size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
