"use client";

// Background music via the YouTube IFrame API (hidden player).
// Autoplay with sound is browser-blocked, so playback starts on a user gesture.

export const MUSIC_VIDEO_ID = "oTu4WcpB9Iw";

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

class MusicController {
  private player: YTPlayer | null = null;
  private ready = false;
  private wantPlaying = false;

  async init(container: HTMLElement) {
    await loadApi();
    if (!window.YT || this.player) return;
    this.player = new window.YT.Player(container, {
      videoId: MUSIC_VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        loop: 1,
        playlist: MUSIC_VIDEO_ID,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          this.ready = true;
          this.player?.setVolume(28);
          if (this.wantPlaying) this.player?.playVideo();
        },
      },
    });
  }

  play() {
    this.wantPlaying = true;
    if (this.ready) this.player?.playVideo();
  }

  pause() {
    this.wantPlaying = false;
    if (this.ready) this.player?.pauseVideo();
  }

  setMuted(muted: boolean) {
    if (!this.ready || !this.player) return;
    if (muted) this.player.mute();
    else this.player.unMute();
  }
}

export const music = new MusicController();
