import { useState } from 'react';
import { projectsByCategory, categoryInfo, ProjectCategory } from '../projects';

interface NavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export const Navigation = ({ activeSection, onNavigate }: NavigationProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = ['home', 'about', 'archives', ...Object.keys(projectsByCategory)] as const;

  const handleNavigate = (section: string) => {
    setMobileOpen(false);
    onNavigate(section);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-700/50">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => handleNavigate('home')} className="font-bold tracking-widest text-zinc-100 text-lg cursor-pointer uppercase">
            damien
          </button>

          <div className="hidden md:flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => handleNavigate(section)}
                className={`px-4 py-2 text-[10px] tracking-widest uppercase transition-colors cursor-pointer
                           ${activeSection === section
                             ? 'text-zinc-100 border-b border-zinc-500'
                             : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {section === 'about' ? 'About' : section === 'archives' ? 'Archives' : categoryInfo[section as ProjectCategory]?.label || section}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMobileOpen(prev => !prev)}
            className="md:hidden text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800/50 pb-3">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => handleNavigate(section)}
                className={`block w-full text-left px-2 py-3 text-[10px] tracking-widest uppercase transition-colors cursor-pointer
                           ${activeSection === section
                             ? 'text-zinc-100'
                             : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {section === 'about' ? 'About' : section === 'archives' ? 'Archives' : categoryInfo[section as ProjectCategory]?.label || section}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
