import { ProjectCategory, categoryInfo, projectsByCategory, Project } from '../projects';
import { ProjectCard, LyricsBar } from './ProjectCard';

interface ProjectSectionProps {
  category: ProjectCategory;
  onSelectProject: (p: Project) => void;
}

export const ProjectSection = ({ category, onSelectProject }: ProjectSectionProps) => {
  const info = categoryInfo[category];
  const categoryProjects = projectsByCategory[category];
  const normalProjects = categoryProjects.filter(p => p.type !== 'lyrics');
  const lyricsProject = categoryProjects.find(p => p.type === 'lyrics');

  return (
    <section className="py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-4xl mb-4 block opacity-60">{info.icon}</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-2">
            {info.label}
          </h2>
          <p className="text-zinc-500 text-sm tracking-widest uppercase">{info.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {normalProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} onSelect={onSelectProject} />
          ))}
        </div>

        {lyricsProject && (
          <div className="mt-6">
            <LyricsBar project={lyricsProject} onSelect={onSelectProject} />
          </div>
        )}
      </div>
    </section>
  );
};
