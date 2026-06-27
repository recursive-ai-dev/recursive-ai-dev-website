import { useState, useEffect } from 'react';
import { Project } from '../projects';
import { MusicState, MusicTrack } from '../types';
import FilePreview from './FilePreview';
import ProjectExplorer from './ProjectExplorer';

interface AudioPlayerProps {
  tracks: { title: string; file: string }[];
  projectTitle: string;
  musicState: MusicState;
}

const AudioPlayer = ({ tracks, projectTitle, musicState }: AudioPlayerProps) => {
  const playlist: MusicTrack[] = tracks.map(t => ({ ...t, projectTitle }));

  return (
    <div className="space-y-1 mt-4">
      {tracks.map((track, i) => {
        const isCurrent = musicState.currentTrack?.file === track.file;
        const trackWithProject = { ...track, projectTitle };

        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-all duration-300 group
                       ${isCurrent ? "bg-zinc-800/80 text-zinc-100 border-l-2 border-zinc-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"}`}
          >
            <button
              className="w-6 text-center font-mono text-xs cursor-pointer hover:scale-110 transition-transform"
              onClick={() => musicState.togglePlay(trackWithProject, playlist)}
            >
              {isCurrent && musicState.isPlaying ? (
                 <div className="flex items-center justify-center gap-0.5 h-3">
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-1 h-full" />
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-2 h-full" />
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-3 h-full" />
                 </div>
              ) : (
                <span className="opacity-60 group-hover:opacity-100">▶</span>
              )}
            </button>
            <span
              className="flex-1 truncate cursor-pointer font-medium tracking-tight"
              onClick={() => musicState.togglePlay(trackWithProject, playlist)}
            >
              {track.title}
            </span>
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={encodeURI(track.file)}
                download
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Download MP3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <span className="text-[10px] font-mono text-zinc-700">MP3</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
  musicState: MusicState;
}

export const ProjectModal = ({ project, onClose, musicState }: ProjectModalProps) => {
  const [lyrics, setLyrics] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'live'>('overview');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    if (project.type === 'lyrics' && project.files) {
      project.files.forEach(async (f) => {
        try {
          const res = await fetch(`./projects/music/lyrics/${encodeURIComponent(f)}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          setLyrics(prev => ({ ...prev, [f]: text }));
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          console.error("Failed to load lyrics", e);
          setLyrics(prev => ({ ...prev, [f]: `[Unable to load ${f}]` }));
        }
      });
    }
    return () => controller.abort();
  }, [project]);

  const hasLivePreview = project.path && (project.type === 'game' || project.path.endsWith('.html'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-w-4xl w-full h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-wide uppercase leading-tight">{project.title}</h3>
              <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase">{project.type}</p>
            </div>

            <div className="flex items-center gap-1 ml-4 bg-black/40 p-1 rounded-sm border border-zinc-800">
               <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('explorer')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'explorer' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Explorer
              </button>
              {hasLivePreview && (
                 <button
                  onClick={() => setActiveTab('live')}
                  className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Live
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-2xl px-2 cursor-pointer transition-colors">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="animate-in fade-in duration-500">
              <p className="text-zinc-200 text-sm leading-relaxed mb-8 border-l-2 border-zinc-800 pl-4 py-2">{project.details || project.description}</p>

              <div className="flex flex-wrap gap-2 mb-8">
                {project.tech.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800">{t}</span>
                ))}
              </div>

              {project.type === 'music' && project.tracks && (
                <div className="mb-8">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4 pb-2 border-b border-zinc-900">Archives ({project.tracks.length} tracks)</h4>
                  <AudioPlayer tracks={project.tracks} projectTitle={project.title} musicState={musicState} />
                </div>
              )}

              {project.type === 'lyrics' && project.files && (
                <div className="space-y-12">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4">Original Manuscripts</h4>
                  {project.files.map((f) => (
                    <div key={f} className="relative">
                      <div className="absolute -top-4 left-4 bg-zinc-950 px-2 text-[10px] text-zinc-600 uppercase tracking-widest">{f}</div>
                      <div className="p-8 bg-zinc-900/20 border border-zinc-800/50 rounded-sm">
                        <pre className="text-zinc-400 text-sm whitespace-pre-wrap font-serif italic leading-relaxed">
                          {lyrics[f] || "CRAWLING SOURCE..."}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {project.files && project.type === 'program' && (
                <div className="mb-8">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4">Core Components</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {project.files.map((f) => (
                      <div key={f} className="text-[10px] px-3 py-2 bg-zinc-900/50 text-zinc-400 border border-zinc-800 font-mono truncate">{f}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 flex gap-4 border-t border-zinc-900 pt-8">
                 {project.path && (
                   <a
                    href={encodeURI(project.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-100 hover:text-white transition-all text-[10px] tracking-widest uppercase"
                   >
                    {project.type === 'game' ? 'Execute Simulation' : project.type === 'ai' ? 'Access Entity' : 'Source View'}
                   </a>
                 )}
                 {project.type === 'program' && (
                    <button className="px-6 py-3 border border-zinc-800 text-zinc-600 transition-all text-[10px] tracking-widest uppercase cursor-not-allowed">
                      Binary Locked
                    </button>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'explorer' && (
            <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500">
              {previewFile ? (
                <FilePreview path={previewFile} onClose={() => setPreviewFile(null)} />
              ) : (
                <ProjectExplorer
                  initialPath={project.path || `projects/${project.category}/${project.id}`}
                  onOpenFile={(path) => setPreviewFile(path)}
                  className="flex-1 border-none bg-transparent"
                />
              )}
            </div>
          )}

          {activeTab === 'live' && hasLivePreview && (
            <div className="h-full flex flex-col animate-in zoom-in-95 duration-500">
              <iframe
                src={project.path ? encodeURI(project.path) : undefined}
                className="flex-1 w-full border border-zinc-800 bg-white"
                title={project.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
