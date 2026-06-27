import { useState, useEffect } from 'react';
import { BlackFlame } from '../ui/GothicElements';
import profileImg from '../../assets/profile.png';
import heroBg from '../../assets/hero-bg.jpg';

export const Hero = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      </div>

      <div
        className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none
                   bg-gradient-radial from-zinc-500 to-transparent transition-all duration-1000 ease-out"
        style={{
          left: mousePos.x - 192,
          top: mousePos.y - 192,
        }}
      />

      <div className="relative text-center z-10 px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 opacity-40 animate-pulse">
            <BlackFlame className="w-8 h-8" />
          </div>
          <img src={profileImg} alt="DAMIEN" className="w-56 h-56 rounded-lg object-cover border-t border-l border-zinc-700/30 shadow-[20px_20px_40px_rgba(0,0,0,0.9),-5px_-5px_15px_rgba(255,255,255,0.02)] hover:scale-[1.02] transition-all duration-1000" />
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-4">
          DAMIEN
        </h1>
        <p className="text-zinc-500 tracking-[0.5em] uppercase text-sm md:text-base">
          Digital Summoning Rituals and Music
        </p>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <span className="text-xs tracking-widest uppercase text-zinc-400">Scroll to Enter</span>
      </div>
    </section>
  );
};
