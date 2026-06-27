import { GothicDivider } from './ui/GothicElements';

export const Contact = () => (
  <section className="py-24 px-6 md:px-12 lg:px-24 bg-black border-t border-zinc-700/50">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">Contact</h2>
      <GothicDivider />
      <p className="text-zinc-300 mb-8 uppercase tracking-widest text-xs">
        Interested in collaborating or have questions? Reach out.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        <a
          href="https://github.com/recursive-ai-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          GitHub &rarr;
        </a>
        <a
          href="https://www.youtube.com/@wbdeadsun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          YouTube &rarr;
        </a>
        <a
          href="tel:+15069535591"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          +1 506-953-5591 &rarr;
        </a>
      </div>
      <div className="pt-12 border-t border-zinc-800/50">
        <p className="text-zinc-500 text-[10px] tracking-[0.4em] mb-2 uppercase">&copy; 2025 &bull; WBDEADSUN Archives</p>
        <p className="text-zinc-600 text-[9px] tracking-[0.2em] uppercase">+1 506-953-5591</p>
      </div>
    </div>
  </section>
);
