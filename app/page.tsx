"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Expand,
  Headphones,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

type Song = {
  name: string;
  file: string;
  url: string;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(true);

  const currentSong =
    currentIndex >= 0 ? songs[currentIndex] : null;

  // -----------------------------------------
  // Load songs from Next.js API
  // -----------------------------------------

  useEffect(() => {
    fetch("/api/songs")
      .then((res) => res.json())
      .then((data: Song[]) => {
        setSongs(data);
      })
      .catch((error) => {
        console.error("Failed to load songs:", error);
        setSongs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // -----------------------------------------
  // Play Song
  // -----------------------------------------

  const playSong = useCallback(
    async (index: number) => {
      const song = songs[index];
      const audio = audioRef.current;

      if (!song || !audio) return;

      setCurrentIndex(index);

      // IMPORTANT:
      // Play directly from Cloudflare R2
      audio.src = song.url;

      audio.load();

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Audio playback failed:", error);
        setIsPlaying(false);
      }
    },
    [songs]
  );

  // -----------------------------------------
  // Play / Pause
  // -----------------------------------------

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    // No song selected
    if (currentIndex === -1) {
      if (songs.length > 0) {
        await playSong(0);
      }

      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error(error);
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  // -----------------------------------------
  // Next Song
  // -----------------------------------------

  const nextSong = useCallback(() => {
    if (!songs.length) return;

    let nextIndex = currentIndex + 1;

    if (isShuffle) {
      nextIndex = Math.floor(
        Math.random() * songs.length
      );
    } else if (nextIndex >= songs.length) {
      nextIndex = 0;
    }

    playSong(nextIndex);
  }, [
    currentIndex,
    isShuffle,
    playSong,
    songs,
  ]);

  // -----------------------------------------
  // Previous Song
  // -----------------------------------------

  const previousSong = () => {
    const audio = audioRef.current;

    if (!audio || !songs.length) return;

    // If song has played for more than 3 sec,
    // restart current song.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let previousIndex = currentIndex - 1;

    if (previousIndex < 0) {
      previousIndex = songs.length - 1;
    }

    playSong(previousIndex);
  };

  // -----------------------------------------
  // Audio Events
  // -----------------------------------------

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;

        audio.play().catch(() => {});
      } else {
        nextSong();
      }
    };

    audio.addEventListener(
      "timeupdate",
      onTimeUpdate
    );

    audio.addEventListener(
      "loadedmetadata",
      onLoadedMetadata
    );

    audio.addEventListener(
      "play",
      onPlay
    );

    audio.addEventListener(
      "pause",
      onPause
    );

    audio.addEventListener(
      "ended",
      onEnded
    );

    return () => {
      audio.removeEventListener(
        "timeupdate",
        onTimeUpdate
      );

      audio.removeEventListener(
        "loadedmetadata",
        onLoadedMetadata
      );

      audio.removeEventListener(
        "play",
        onPlay
      );

      audio.removeEventListener(
        "pause",
        onPause
      );

      audio.removeEventListener(
        "ended",
        onEnded
      );
    };
  }, [isRepeat, nextSong]);

  // -----------------------------------------
  // Volume
  // -----------------------------------------

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // -----------------------------------------
  // Keyboard Controls
  // -----------------------------------------

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent
    ) => {
      const target =
        event.target as HTMLElement | null;

      if (target?.tagName === "INPUT") return;

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }

      if (event.code === "ArrowRight") {
        nextSong();
      }

      if (event.code === "ArrowLeft") {
        previousSong();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  });

  // -----------------------------------------
  // Progress / Seek
  // -----------------------------------------

  const seek = (value: number) => {
    const audio = audioRef.current;

    if (!audio || !duration) return;

    audio.currentTime =
      (value / 100) * duration;

    setCurrentTime(audio.currentTime);
  };

  // -----------------------------------------
  // Fullscreen
  // -----------------------------------------

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <main className="app-shell">

      {/* Background */}

      <div className="background-image" />

      <div className="background-vignette" />

      <div className="grain" />


      {/* Header */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            <Music2 size={18} />
          </div>

          <span>
            Chill &amp; Enjoy
          </span>

        </div>


        <div className="online-pill">

          <span className="online-dot" />

          Your music space

        </div>


        <button
          className="icon-button"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
        >
          <Expand size={18} />
        </button>

      </header>


      {/* Main */}

      <section className="main-grid">


        {/* Hero */}

        <div className="hero">

          <div className="hero-kicker">

            <Headphones size={15} />

            PUT YOUR HEADPHONES ON

          </div>


          <h1>

            Chill

            <br />

            <span>
              &amp; Enjoy
            </span>

          </h1>


          <p>
            Relax, forget the noise and enjoy
            your favorite songs in your own
            little corner of the world.
          </p>


          <div className="hero-hint">

            <span>SPACE</span>

            play / pause

            <span>← →</span>

            previous / next

          </div>

        </div>


        {/* Playlist */}

        <aside className="playlist-card glass">

          <div className="playlist-header">

            <div>

              <div className="eyebrow">
                YOUR PLAYLIST
              </div>

              <h2>
                My Songs
              </h2>

            </div>


            <div className="song-count">
              {songs.length} songs
            </div>

          </div>


          <div className="song-list">

            {loading ? (

              <div className="empty-state">
                Loading your songs...
              </div>

            ) : songs.length === 0 ? (

              <div className="empty-state">

                <ListMusic size={30} />

                <strong>
                  No songs found
                </strong>

                <span>
                  Check your R2 filenames
                </span>

              </div>

            ) : (

              songs.map(
                (song, index) => {

                  const active =
                    index === currentIndex;


                  return (

                    <button
                      key={song.file}
                      className={`song-row ${
                        active
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        playSong(index)
                      }
                    >

                      <span className="song-number">

                        {String(index + 1)
                          .padStart(2, "0")}

                      </span>


                      <span className="song-art">

                        {active &&
                        isPlaying ? (
                          <Volume2 size={16} />
                        ) : (
                          <Music2 size={16} />
                        )}

                      </span>


                      <span className="song-title">

                        {song.name}

                      </span>


                      <span className="row-action">

                        {active &&
                        isPlaying ? (
                          <Pause size={15} />
                        ) : (
                          <Play size={15} />
                        )}

                      </span>

                    </button>

                  );
                }
              )

            )}

          </div>

        </aside>

      </section>


      {/* Player */}

      <section className="player glass">


        {/* Current Song */}

        <div className="now-playing">

          <div
            className={`cover ${
              isPlaying
                ? "spinning"
                : ""
            }`}
          >

            <Music2 size={22} />

          </div>


          <div className="now-text">

            <span className="eyebrow">
              NOW PLAYING
            </span>

            <strong>
              {currentSong?.name ??
                "Select a song"}
            </strong>

            <small>
              Streaming from Cloudflare R2
            </small>

          </div>

        </div>


        {/* Controls */}

        <div className="player-center">

          <div className="controls">


            {/* Shuffle */}

            <button
              className={`control ${
                isShuffle
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setIsShuffle(!isShuffle)
              }
              aria-label="Shuffle"
            >

              <Shuffle size={17} />

            </button>


            {/* Previous */}

            <button
              className="control"
              onClick={previousSong}
              aria-label="Previous"
            >

              <SkipBack size={20} />

            </button>


            {/* Play */}

            <button
              className="play-main"
              onClick={togglePlay}
              aria-label="Play or pause"
            >

              {isPlaying ? (
                <Pause
                  size={20}
                  fill="currentColor"
                />
              ) : (
                <Play
                  size={20}
                  fill="currentColor"
                />
              )}

            </button>


            {/* Next */}

            <button
              className="control"
              onClick={nextSong}
              aria-label="Next"
            >

              <SkipForward size={20} />

            </button>


            {/* Repeat */}

            <button
              className={`control ${
                isRepeat
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setIsRepeat(!isRepeat)
              }
              aria-label="Repeat"
            >

              <Repeat size={17} />

            </button>

          </div>


          {/* Progress */}

          <div className="progress-line">

            <span>
              {formatTime(currentTime)}
            </span>


            <input
              type="range"
              min="0"
              max="100"
              value={
                duration
                  ? (currentTime /
                      duration) *
                    100
                  : 0
              }
              onChange={(event) =>
                seek(
                  Number(
                    event.target.value
                  )
                )
              }
              aria-label="Song progress"
            />


            <span>
              {formatTime(duration)}
            </span>

          </div>

        </div>


        {/* Volume */}

        <div className="volume-control">

          <button
            className="volume-icon"
            onClick={() =>
              setVolume(
                volume > 0
                  ? 0
                  : 0.8
              )
            }
            aria-label="Mute"
          >

            {volume === 0 ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}

          </button>


          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) =>
              setVolume(
                Number(
                  event.target.value
                )
              )
            }
            aria-label="Volume"
          />

        </div>

      </section>


      {/* Audio */}

      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
      />

    </main>
  );
}