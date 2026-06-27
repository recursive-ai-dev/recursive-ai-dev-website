import { useState, useEffect, useRef, useCallback } from 'react';
import { MusicTrack, MusicState } from '../types';

export function useAudio(): MusicState {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleVolumeChange = () => setVolumeState(audio.volume);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("volumechange", handleVolumeChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const nextTrack = useCallback(() => {
    if (playlist.length > 0 && currentTrack) {
      const currentIndex = playlist.findIndex(t => t.file === currentTrack.file);
      const nextIndex = (currentIndex + 1) % playlist.length;
      togglePlay(playlist[nextIndex], playlist);
    }
  }, [playlist, currentTrack]);

  const previousTrack = useCallback(() => {
    if (playlist.length > 0 && currentTrack) {
      const currentIndex = playlist.findIndex(t => t.file === currentTrack.file);
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      togglePlay(playlist[prevIndex], playlist);
    }
  }, [playlist, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => nextTrack();
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [nextTrack]);

  const togglePlay = useCallback((track?: MusicTrack, playlistData?: MusicTrack[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (track) {
      if (playlistData) setPlaylist(playlistData);
      if (currentTrack?.file === track.file) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.play().catch(console.error);
          setIsPlaying(true);
        }
      } else {
        audio.src = encodeURI(track.file);
        audio.play().catch(console.error);
        setCurrentTrack(track);
        setIsPlaying(true);
      }
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else if (currentTrack) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) {
      audioRef.current.volume = v;
      setVolumeState(v);
    }
  }, []);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    previousTrack,
  };
}
