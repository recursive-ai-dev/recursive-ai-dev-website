import { useState, useEffect } from 'react';
import { projects, projectsByCategory, categoryInfo, type Project, type ProjectCategory } from './projects';

const GothicDivider = () => (
  <div className="flex items-center justify-center gap-4 my-12">
    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-700 to-zinc-600" />
    <svg viewBox="0 0 100 30" className="w-24 h-8 fill-zinc-600">
      <path d="M50 0 L55 10 L65 10 L57 17 L60 28 L50 22 L40 28 L43 17 L35 10 L45 10 Z" />
    </svg>
    <div className="h-px w-24 bg-gradient-to-l from-transparent via-zinc-700 to-zinc-600" />
  </div>
);

const Navigation = ({ activeSection, onNavigate }: { activeSection: string; onNavigate: (section: string) => void }) => {
  const sections = ['home', 'about', ...Object.keys(projectsByCategory)] as const;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate('home')} className="font-bold tracking-widest text-zinc-100 text-lg cursor-pointer">
            ARCHIVE
          </button>

          <div className="hidden md:flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => onNavigate(section)}
                className={`px-4 py-2 text-xs tracking-widest uppercase transition-colors cursor-pointer
                           ${activeSection === section
                             ? 'text-zinc-100 border-b border-zinc-500'
                             : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {section === 'about' ? 'About' : categoryInfo[section as ProjectCategory]?.label || section}
              </button>
            ))}
          </div>

          <button className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const allCategories = Object.entries(categoryInfo) as [ProjectCategory, typeof categoryInfo[ProjectCategory]][];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/images/hero-bg.jpg"
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

      <div className="relative z-10 text-center px-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-zinc-700" />
          <svg viewBox="0 0 50 50" className="w-8 h-8 fill-zinc-700">
            <polygon points="25,5 30,20 45,20 33,30 38,45 25,35 12,45 17,30 5,20 20,20" />
          </svg>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-zinc-700" />
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-widest text-zinc-100 mb-6 drop-shadow-2xl">
          recursive-ai-dev
          <br />
          <span className="text-zinc-400">Archives</span>
        </h1>

        <p className="text-zinc-500 text-lg md:text-xl tracking-widest uppercase mb-8 max-w-xl mx-auto">
          Games &bull; Music &bull; Programs &bull; AI
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {allCategories.map(([cat, info]) => (
            <span key={cat} className="text-xs tracking-widest text-zinc-600 border border-zinc-800
                                       px-3 py-1 uppercase hover:border-zinc-600 hover:text-zinc-400
                                       transition-colors">
              {info.label}
            </span>
          ))}
        </div>

        <div className="animate-bounce">
          <svg className="w-6 h-6 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      <div className="absolute top-20 left-6 w-12 h-12 border-l border-t border-zinc-800/50" />
      <div className="absolute top-20 right-6 w-12 h-12 border-r border-t border-zinc-800/50" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-l border-b border-zinc-800/50" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-r border-b border-zinc-800/50" />
    </section>
  );
};

const About = () => {
  const totalGames = projects.filter(p => p.category === 'games').length;
  const totalTracks = projects.filter(p => p.type === 'music').reduce((sum, p) => sum + (p.tracks?.length || 0), 0);
  const totalPrograms = projects.filter(p => p.category === 'programs').length;
  const totalAI = projects.filter(p => p.category === 'ai').length;

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-black to-zinc-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">About</h2>
        <GothicDivider />
        <p className="text-zinc-400 text-lg leading-relaxed mb-8">
          An archive of projects across mediums — interactive games, AI research, atmospheric music, and system-level software.
          Each entry documents work built with dedication to craft and authenticity.
        </p>
        <p className="text-zinc-500 text-base leading-relaxed">
          From web games and language models to dark electronic tracks and security tools — this is a growing record of recursive-ai-dev's output.
        </p>
        <GothicDivider />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
          {[
            { label: "Games", value: `${totalGames}` },
            { label: "AI Projects", value: `${totalAI}` },
            { label: "Tracks", value: `${totalTracks}+` },
            { label: "Programs", value: `${totalPrograms}` },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-zinc-300 mb-2">{stat.value}</div>
              <div className="text-xs text-zinc-600 tracking-widest uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AudioPlayer = ({ tracks }: { tracks: { title: string; file: string }[] }) => {
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  const [audioRef] = useState(() => new Audio());

  useEffect(() => {
    audioRef.addEventListener('ended', () => {
      if (currentTrack !== null && currentTrack < tracks.length - 1) {
        setCurrentTrack(currentTrack + 1);
      } else {
        setCurrentTrack(null);
      }
    });
    return () => {
      audioRef.pause();
      audioRef.src = '';
    };
  }, [currentTrack, tracks.length, audioRef]);

  useEffect(() => {
    if (currentTrack !== null) {
      audioRef.src = tracks[currentTrack].file;
      audioRef.play().catch(() => {});
    } else {
      audioRef.pause();
      audioRef.src = '';
    }
  }, [currentTrack, audioRef, tracks]);

  const togglePlay = (index: number) => {
    if (currentTrack === index) {
      if (audioRef.paused) {
        audioRef.play().catch(() => {});
      } else {
        audioRef.pause();
      }
    } else {
      setCurrentTrack(index);
    }
  };

  return (
    <div className="space-y-1 mt-4">
      {tracks.map((track, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer
                     ${currentTrack === i ? 'bg-zinc-800/50 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
          onClick={() => togglePlay(i)}
        >
          <span className="w-6 text-center font-mono text-xs">{currentTrack === i && !audioRef.paused ? '▶' : currentTrack === i ? '⏸' : String(i + 1).padStart(2, '0')}</span>
          <span className="flex-1 truncate">{track.title}</span>
          <span className="text-zinc-700 text-xs">MP3</span>
        </div>
      ))}
    </div>
  );
};

const ProjectModal = ({ project, onClose }: { project: Project; onClose: () => void }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-zinc-950 border border-zinc-800 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-2xl cursor-pointer">&times;</button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 tracking-wide">{project.title}</h3>
            <p className="text-zinc-600 text-sm tracking-widest uppercase mt-1">{categoryInfo[project.category].label}</p>
          </div>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed mb-6">{project.details || project.description}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {project.tech.map((t) => (
            <span key={t} className="text-xs px-2 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800">{t}</span>
          ))}
        </div>

        {project.type === 'music' && project.tracks && (
          <div className="mb-6">
            <h4 className="text-xs tracking-widest uppercase text-zinc-600 mb-3">Tracks ({project.tracks.length})</h4>
            <AudioPlayer tracks={project.tracks} />
          </div>
        )}

        {project.type === 'lyrics' && project.files && (
          <div className="mb-6">
            <h4 className="text-xs tracking-widest uppercase text-zinc-600 mb-3">Lyric Sheets</h4>
            <div className="space-y-2">
              {project.files.map((f) => (
                <a
                  key={f}
                  href={`projects/music/lyrics/${f}`}
                  target="_blank"
                  className="block px-3 py-2 text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                >
                  {f}
                </a>
              ))}
            </div>
          </div>
        )}

        {project.files && project.type === 'program' && (
          <div className="mb-6">
            <h4 className="text-xs tracking-widest uppercase text-zinc-600 mb-3">Files</h4>
            <div className="flex flex-wrap gap-2">
              {project.files.map((f) => (
                <span key={f} className="text-xs px-2 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800">{f}</span>
              ))}
            </div>
          </div>
        )}

        {project.path && project.type === 'ai' && (
          <a
            href={project.path}
            target="_blank"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 px-4 py-2 hover:border-zinc-600"
          >
            Open File &rarr;
          </a>
        )}

        {project.path && project.type === 'game' && (
          <a
            href={project.path}
            target="_blank"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 px-4 py-2 hover:border-zinc-600"
          >
            Play Game &rarr;
          </a>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, index, onSelect }: { project: Project; index: number; onSelect: (p: Project) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  const categoryLabel = categoryInfo[project.category].icon;

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
          <span className={`text-xs font-mono tracking-wider px-2 py-0.5 border ${
            project.type === 'game' ? 'text-emerald-600 border-emerald-900/50' :
            project.type === 'music' ? 'text-violet-600 border-violet-900/50' :
            project.type === 'ai' ? 'text-cyan-600 border-cyan-900/50' :
            'text-amber-600 border-amber-900/50'
          }`}>
            {project.type}
          </span>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-4 group-hover:text-zinc-300 transition-colors line-clamp-3">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {project.tech.slice(0, 3).map((tech) => (
            <span key={tech} className="text-xs px-2 py-1 bg-zinc-900/80 text-zinc-500 border border-zinc-800
                                       group-hover:border-zinc-700 transition-colors">
              {tech}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="text-xs px-2 py-1 text-zinc-600">+{project.tech.length - 3}</span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <span>View Details</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </div>
  );
};

const Section = ({ category, onSelectProject }: { category: ProjectCategory; onSelectProject: (p: Project) => void }) => {
  const info = categoryInfo[category];
  const categoryProjects = projectsByCategory[category];

  return (
    <section className="py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-4xl mb-4 block opacity-60">{info.icon}</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-2">
            {info.label}
          </h2>
          <p className="text-zinc-600 text-sm tracking-widest uppercase">{info.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} onSelect={onSelectProject} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => (
  <section className="py-24 px-6 md:px-12 lg:px-24 bg-black border-t border-zinc-800/50">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">Contact</h2>
      <GothicDivider />
      <p className="text-zinc-400 mb-8">
        Interested in collaborating or have questions? Reach out.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {['GitHub', 'Twitter', 'SoundCloud', 'Email'].map((platform) => (
          <a
            key={platform}
            href="#"
            className="px-6 py-3 border border-zinc-800 text-zinc-400 hover:border-zinc-600
                       hover:text-zinc-200 transition-all text-sm tracking-widest uppercase"
          >
            {platform}
          </a>
        ))}
      </div>
      <div className="pt-12 border-t border-zinc-800/50">
        <p className="text-zinc-700 text-xs tracking-widest">&copy; 2025 &bull; recursive-ai-dev Archives</p>
      </div>
    </div>
  </section>
);

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(section);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 antialiased">
      <Navigation activeSection={activeSection} onNavigate={scrollToSection} />

      <main>
        <Hero />
        <About />

        {(Object.keys(projectsByCategory) as ProjectCategory[]).map((category) => (
          <div key={category} id={category}>
            <Section category={category} onSelectProject={setSelectedProject} />
            <GothicDivider />
          </div>
        ))}

        <Contact />
      </main>

      {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
}
