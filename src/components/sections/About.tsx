import { projectsByCategory } from '../../projects';
import { GothicDivider } from '../ui/GothicElements';

export const About = () => {
  const totalGames = projectsByCategory['games']?.length || 0;
  const totalAI = projectsByCategory['ai']?.length || 0;
  const totalPrograms = projectsByCategory['programs']?.length || 0;
  const totalCharacters = projectsByCategory['characters']?.length || 0;
  const totalMCP = projectsByCategory['mcp']?.length || 0;
  const totalTracks = (projectsByCategory['music'] || []).reduce((acc, p) => acc + (p.tracks?.length || 0), 0);

  return (
    <section id="about" className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-black to-zinc-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">About</h2>
        <GothicDivider />
        <p className="text-zinc-300 text-lg leading-relaxed mb-8">
          I enjoy vibe coding, have been writing lyrics for 20 years, and can never seem to finish a project.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalTracks}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Audio Records</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalAI}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">AI Entities</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalPrograms}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Ritual Scripts</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalGames}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Simulations</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalCharacters}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Lore Tomes</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalMCP}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">MCP Servers</span>
          </div>
        </div>
        <GothicDivider />
      </div>
    </section>
  );
};
