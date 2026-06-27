import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { useScrollReveal } from './hooks/useScrollReveal';
import { Navigation } from './components/Navigation';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Archives } from './components/sections/Archives';
import { Contact } from './components/Contact';
import { ProjectSection } from './components/ProjectSection';
import { ProjectModal } from './components/ProjectModal';
import { GlobalPlayer } from './components/GlobalPlayer';
import { GothicDivider } from './components/ui/GothicElements';
import { Project, ProjectCategory, projectsByCategory } from './projects';

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const musicState = useAudio();
  useScrollReveal();

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
    <div className="min-h-screen bg-black text-zinc-100 antialiased pb-24">
      <Navigation activeSection={activeSection} onNavigate={scrollToSection} />

      <main>
        <Hero />
        <div className="reveal">
          <About />
        </div>
        <div className="reveal">
          <Archives />
        </div>

        {(Object.keys(projectsByCategory) as ProjectCategory[]).map((category) => (
          <div key={category} id={category} className="reveal">
            <ProjectSection category={category} onSelectProject={setSelectedProject} />
            <GothicDivider />
          </div>
        ))}

        <div className="reveal">
          <Contact />
        </div>
      </main>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          musicState={musicState}
        />
      )}

      <GlobalPlayer musicState={musicState} />
    </div>
  );
}
