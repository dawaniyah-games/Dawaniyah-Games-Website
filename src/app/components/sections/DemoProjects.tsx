import React from 'react';
import { motion } from 'motion/react';
import { Play, Volume2, VolumeX } from 'lucide-react';

const demos = [
  {
    title: "Dendon Games Gameplay",
    genre: "Social Board Game",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-traffic-at-night-34444-large.mp4",
  }
];

export function DemoProjects() {
  const [muted, setMuted] = React.useState(true);

  return (
    <section id="gameplay-demos" className="py-24 bg-[#0a0219] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#DC00D3] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            GAMEPLAY <span className="text-[#D4AF37]">DEMOS</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Experience the fluid mechanics and immersive visuals of our latest builds.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {demos.map((demo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15 }}
              className="group relative rounded-2xl overflow-hidden border border-[#DC00D3]/20 bg-[#150530] shadow-xl hover:shadow-[#DC00D3]/20 transition-all duration-300"
            >
              {/* Video Container */}
              <div className="relative aspect-video w-full overflow-hidden">
                <video
                  src={demo.videoUrl}
                  autoPlay
                  muted={muted}
                  loop
                  playsInline
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-110"
                  style={{ willChange: "transform" }}
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0219] via-transparent to-transparent opacity-90" />

                {/* Status Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
                  <span className="text-xs font-mono text-white/90 uppercase tracking-wider">Live Demo</span>
                </div>

                 {/* Sound Control (Optional interactivity) */}
                 <button 
                  onClick={() => setMuted(!muted)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* Content */}
              <div className="p-6 relative">
                <h3 className="text-xl font-bold text-white mb-1 font-['Josefin_Sans'] group-hover:text-[#DC00D3] transition-colors">
                  {demo.title}
                </h3>
                <p className="text-[#D4AF37] text-sm font-medium mb-4">{demo.genre}</p>
                
                <div className="flex items-center gap-2 text-gray-400 text-sm group-hover:text-white transition-colors">
                  <Play size={14} className="fill-current" />
                  <span>Watch full gameplay</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
