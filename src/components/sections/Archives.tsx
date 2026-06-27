import { useState } from 'react';
import FilePreview from '../FilePreview';
import ProjectExplorer from '../ProjectExplorer';

export const Archives = () => {
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  return (
    <section id="archives" className="py-24 px-6 md:px-12 lg:px-24 bg-black border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
         <div className="text-center mb-12">
          <span className="text-4xl mb-4 block opacity-60">📁</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-2">
            The Archives
          </h2>
          <p className="text-zinc-500 text-sm tracking-widest uppercase">Deep filesystem inspection</p>
        </div>

        <div className="h-[600px] shadow-2xl bg-zinc-950 border border-zinc-800">
           {previewFile ? (
             <FilePreview path={previewFile} onClose={() => setPreviewFile(null)} />
           ) : (
             <ProjectExplorer
              initialPath="projects"
              onOpenFile={(path) => setPreviewFile(path)}
              className="h-full border-none"
             />
           )}
        </div>
      </div>
    </section>
  );
};
