import { useState } from 'react';
import { Project, categoryInfo } from '../projects';

interface ProjectCardProps {
  project: Project;
  index: number;
  onSelect: (p: Project) => void;
}

export const ProjectCard = ({ project, index, onSelect }: ProjectCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const categoryLabel = categoryInfo[project.category]?.icon || '◈';

  return (
    <div
      className="group relative bg-gradient-to-b from-zinc-900/90 to-black/95 border border-zinc-800/50
                 hover:border-zinc-600/60 transition-all duration-500 overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(project)}
    >
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />

      <div className={`absolute inset-0 bg-gradient-radial from-zinc-800/20 via-transparent to-transparent
                       transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-zinc-100 tracking-wide group-hover:text-white transition-colors">
            {categoryLabel} {project.title}
          </h3>
          <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 border ${
            project.type === 'game' ? 'text-emerald-400 border-emerald-800/50' :
            project.type === 'music' ? 'text-violet-400 border-violet-800/50' :
            project.type === 'ai' ? 'text-cyan-400 border-cyan-800/50' :
            project.type === 'lore' ? 'text-rose-400 border-rose-800/50' :
            'text-amber-400 border-amber-800/50'
          }`}>
            {project.type}
          </span>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed mb-4 group-hover:text-zinc-200 transition-colors line-clamp-3">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {project.tech.slice(0, 3).map((tech) => (
            <span key={tech} className="text-[10px] px-2 py-1 bg-zinc-900/80 text-zinc-400 border border-zinc-700
                                       group-hover:border-zinc-600 transition-colors">
              {tech}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="text-[10px] px-2 py-1 text-zinc-500">+{project.tech.length - 3}</span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <span className="text-[10px] uppercase tracking-widest font-bold">View Archive</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </div>
  );
};

export const LyricsBar = ({ project, onSelect }: { project: Project; onSelect: (p: Project) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-gradient-to-b from-zinc-900/90 to-black/95 border border-zinc-800/50
                 hover:border-zinc-600/60 transition-all duration-500 overflow-hidden cursor-pointer col-span-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(project)}
    >
      <div className={`absolute inset-0 bg-gradient-radial from-zinc-800/20 via-transparent to-transparent
                       transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative flex items-center gap-4 p-3 md:p-4">
        <span className="text-2xl opacity-60">{categoryInfo[project.category].icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-zinc-100 tracking-wide uppercase">{project.title}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed truncate">{project.description}</p>
        </div>
        <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 border text-amber-400 border-amber-800/50 shrink-0">
          {project.type}
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
          <span className="text-[10px] uppercase tracking-widest font-bold">View Details</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </div>
  );
};
