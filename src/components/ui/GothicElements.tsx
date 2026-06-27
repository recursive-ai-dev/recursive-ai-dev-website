import { useId } from 'react';

export const BlackFlame = ({ className = "w-8 h-8" }: { className?: string }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 50 56" className={`${className} drop-shadow-[0_0_10px_rgba(255,255,255,0.12)]`}>
      <defs>
        <filter id={`flame-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g style={{ filter: `url(#flame-glow-${id})` }}>
      <path d="M25 54 C25 54 6 30 6 18 C6 9 13 2 25 2 C37 2 44 9 44 18 C44 30 25 54 25 54 Z" fill="#1a1a1a" stroke="#444" strokeWidth="0.6" />
      <path d="M25 48 C25 48 11 28 11 19 C11 12 17 6 25 6 C33 6 39 12 39 19 C39 28 25 48 25 48 Z" fill="#222" />
      <path d="M25 40 C25 40 15 25 15 19 C15 14 19 10 25 10 C31 10 35 14 35 19 C35 25 25 40 25 40 Z" fill="#333" />
      <path d="M25 32 C25 32 19 22 19 18 C19 15 22 12 25 12 C28 12 31 15 31 18 C31 22 25 32 25 32 Z" fill="#444" />
      <path d="M25 26 C25 26 22 20 22 18 C22 16 23.5 14 25 14 C26.5 14 28 16 28 18 C28 20 25 26 25 26 Z" fill="#555" />
      </g>
    </svg>
  );
};

export const GothicDivider = () => (
  <div className="flex items-center justify-center gap-4 my-12">
    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-600 to-zinc-500" />
    <BlackFlame className="w-8 h-8 fill-zinc-500" />
    <div className="h-px w-24 bg-gradient-to-l from-transparent via-zinc-600 to-zinc-500" />
  </div>
);
