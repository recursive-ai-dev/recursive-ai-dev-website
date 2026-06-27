import { MusicState } from '../types';

export const GlobalPlayer = ({ musicState }: { musicState: MusicState }) => {
  if (!musicState.currentTrack) return null;

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950/90 border-t border-zinc-800 px-4 md:px-6 py-3 backdrop-blur-xl flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 min-w-0 md:w-1/4">
        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 relative overflow-hidden group">
           {musicState.isPlaying && (
             <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-30">
                <div className="w-1 bg-zinc-400 animate-music-bar-1 h-3" />
                <div className="w-1 bg-zinc-400 animate-music-bar-2 h-5" />
                <div className="w-1 bg-zinc-400 animate-music-bar-3 h-4" />
             </div>
           )}
          <span className="text-zinc-500 text-xl relative z-10">♪</span>
        </div>
        <div className="min-w-0">
          <h4 className="text-zinc-100 text-sm font-bold truncate tracking-wide">{musicState.currentTrack.title}</h4>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest truncate">{musicState.currentTrack.projectTitle}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 max-w-2xl px-4">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => musicState.previousTrack()}
            className="text-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer p-1"
            title="Previous Track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>

          <button
            onClick={() => musicState.togglePlay()}
            className="w-10 h-10 rounded-full bg-zinc-100 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-lg shadow-white/5"
          >
            {musicState.isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button
            onClick={() => musicState.nextTrack()}
            className="text-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer p-1"
            title="Next Track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{formatTime(musicState.currentTime)}</span>
          <div className="relative flex-1 group py-2 flex items-center">
            <input
              type="range"
              min="0"
              max={musicState.duration || 0}
              value={musicState.currentTime}
              onChange={(e) => musicState.seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400 hover:accent-zinc-200 transition-all"
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 w-8">{formatTime(musicState.duration)}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-end gap-6 md:w-1/4">
         <div className="flex items-center gap-2 group">
            <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicState.volume}
              onChange={(e) => musicState.setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500 hover:accent-zinc-300 transition-all"
            />
         </div>
        <a
          href={encodeURI(musicState.currentTrack.file)}
          download
          className="text-[10px] tracking-widest uppercase text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-2 border border-zinc-800 px-3 py-1.5 hover:bg-zinc-900"
        >
          MP3 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
      </div>
    </div>
  );
};
