import { Project, ProjectCategory } from '../projects';

export interface MusicTrack {
  title: string;
  file: string;
  projectTitle: string;
}

export interface MusicState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playlist: MusicTrack[];
  togglePlay: (track?: MusicTrack, playlist?: MusicTrack[]) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}
