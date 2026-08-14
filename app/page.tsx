"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
  X,
} from "lucide-react";

type Song = {
  name: string;
  file: string;
  url: string;
};

type Theme = {
  id: string;
  name: string;
  folder: string;
  songs: Song[];
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --------------------------------------------------
  // THEMES
  // --------------------------------------------------

  const [themes, setThemes] = useState<Theme[]>([]);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  // --------------------------------------------------
  // SONGS
  // --------------------------------------------------

  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // --------------------------------------------------
  // PLAYER STATE
  // --------------------------------------------------

  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);

  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // PLAYLIST
  // --------------------------------------------------

  const [showPlaylist, setShowPlaylist] = useState(true);
  const [mobilePlaylist, setMobilePlaylist] = useState(false);

  // --------------------------------------------------
  // CURRENT THEME / SONG
  // --------------------------------------------------

  const currentTheme = themes[currentThemeIndex] ?? null;

  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;

  // --------------------------------------------------
  // LOAD THEMES + SONGS FROM R2
  // --------------------------------------------------

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/songs", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load songs");
        }

        const data: { themes: Theme[] } = await response.json();

        setThemes(data.themes);

        if (data.themes.length > 0) {
          setCurrentThemeIndex(0);
          setSongs(data.themes[0].songs);
        } else {
          setSongs([]);
        }
      } catch (error) {
        console.error("Song loading error:", error);

        setThemes([]);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, []);

  // --------------------------------------------------
  // THEME NAVIGATION
  // --------------------------------------------------

  const changeTheme = useCallback(
    (direction: number) => {
      if (themes.length <= 1) return;

      const audio = audioRef.current;

      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
      }

      setIsPlaying(false);
      setCurrentIndex(-1);
      setCurrentTime(0);
      setDuration(0);

      setCurrentThemeIndex((prev) => {
        return (prev + direction + themes.length) % themes.length;
      });
    },
    [themes.length],
  );

  const nextTheme = useCallback(() => {
    changeTheme(1);
  }, [changeTheme]);

  const previousTheme = useCallback(() => {
    changeTheme(-1);
  }, [changeTheme]);

  // --------------------------------------------------
// MOBILE SWIPE THEME NAVIGATION
// --------------------------------------------------

const touchStartX = useRef<number | null>(null);
const touchStartY = useRef<number | null>(null);

const handleTouchStart = (
  event: React.TouchEvent<HTMLElement>
) => {
  const touch = event.touches[0];

  touchStartX.current = touch.clientX;
  touchStartY.current = touch.clientY;
};

const handleTouchEnd = (
  event: React.TouchEvent<HTMLElement>
) => {
  if (
    touchStartX.current === null ||
    touchStartY.current === null
  ) {
    return;
  }

  const touch = event.changedTouches[0];

  const deltaX =
    touch.clientX - touchStartX.current;

  const deltaY =
    touch.clientY - touchStartY.current;

  // Reset
  touchStartX.current = null;
  touchStartY.current = null;

  // Ignore mostly vertical swipes
  if (Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  // Minimum swipe distance
  const SWIPE_THRESHOLD = 60;

  if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
    return;
  }

  // Swipe LEFT → NEXT THEME
  if (deltaX < 0) {
    nextTheme();
  }

  // Swipe RIGHT → PREVIOUS THEME
  if (deltaX > 0) {
    previousTheme();
  }
};

  // --------------------------------------------------
  // UPDATE SONGS WHEN THEME CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!themes.length) return;

    const theme = themes[currentThemeIndex];

    if (!theme) return;

    setSongs(theme.songs);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [currentThemeIndex, themes]);

  // --------------------------------------------------
  // PLAY SONG
  // --------------------------------------------------

  const playSong = useCallback(
    async (index: number) => {
      const song = songs[index];
      const audio = audioRef.current;

      if (!song || !audio) return;

      setCurrentIndex(index);

      audio.src = song.url;
      audio.load();

      setCurrentTime(0);
      setDuration(0);

      try {
        await audio.play();

        setIsPlaying(true);
      } catch (error) {
        console.error("Playback error:", error);

        setIsPlaying(false);
      }
    },
    [songs],
  );

  // --------------------------------------------------
  // PLAY / PAUSE
  // --------------------------------------------------

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

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
      }
    } else {
      audio.pause();

      setIsPlaying(false);
    }
  };

  // --------------------------------------------------
  // RANDOM SONG
  // --------------------------------------------------

  const getRandomSongIndex = useCallback(() => {
    if (songs.length <= 1) return 0;

    let randomIndex = currentIndex;

    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * songs.length);
    }

    return randomIndex;
  }, [songs.length, currentIndex]);

  // --------------------------------------------------
  // NEXT SONG
  // --------------------------------------------------

  const nextSong = useCallback(() => {
    if (!songs.length) return;

    let nextIndex: number;

    if (isShuffle) {
      nextIndex = getRandomSongIndex();
    } else {
      nextIndex = currentIndex + 1;

      if (nextIndex >= songs.length) {
        nextIndex = 0;
      }
    }

    playSong(nextIndex);
  }, [currentIndex, isShuffle, getRandomSongIndex, playSong, songs.length]);

  // --------------------------------------------------
  // PREVIOUS SONG
  // --------------------------------------------------

  const previousSong = () => {
    const audio = audioRef.current;

    if (!audio || !songs.length) return;

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

  // --------------------------------------------------
  // AUDIO EVENTS
  // --------------------------------------------------

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;

        audio.play().catch(() => {});
      } else {
        nextSong();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    audio.addEventListener("play", handlePlay);

    audio.addEventListener("pause", handlePause);

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);

      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);

      audio.removeEventListener("play", handlePlay);

      audio.removeEventListener("pause", handlePause);

      audio.removeEventListener("ended", handleEnded);
    };
  }, [isRepeat, nextSong]);

  // --------------------------------------------------
  // VOLUME
  // --------------------------------------------------

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // --------------------------------------------------
  // SEEK
  // --------------------------------------------------

  const seek = (value: number) => {
    const audio = audioRef.current;

    if (!audio || !duration) return;

    audio.currentTime = (value / 100) * duration;

    setCurrentTime(audio.currentTime);
  };

  // --------------------------------------------------
  // FULLSCREEN
  // --------------------------------------------------

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

  // --------------------------------------------------
  // KEYBOARD CONTROLS
  // --------------------------------------------------

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.tagName === "INPUT") return;

      if (event.code === "Space") {
        event.preventDefault();

        togglePlay();
      }

      // Keyboard arrows now change themes
      if (event.code === "ArrowRight") {
        nextTheme();
      }

      if (event.code === "ArrowLeft") {
        previousTheme();
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  });

  // --------------------------------------------------
  // MOBILE SONG
  // --------------------------------------------------

  const selectMobileSong = (index: number) => {
    playSong(index);

    setMobilePlaylist(false);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="music-page" >
      {/* -------------------------------------------
          BACKGROUND
      ------------------------------------------- */}

      <div
        className="background-image"
        style={{
          backgroundImage: currentTheme
            ? `url("${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/background/${currentTheme.folder}.png")`
            : "none",
        }}
      />

      <div className="background-overlay" />

      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* -------------------------------------------
          THEME ARROWS
      ------------------------------------------- */}

      {themes.length > 1 && (
        <>
          <button
            className="theme-arrow theme-arrow-left"
            onClick={previousTheme}
            aria-label="Previous theme"
            title="Previous theme"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            className="theme-arrow theme-arrow-right"
            onClick={nextTheme}
            aria-label="Next theme"
            title="Next theme"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* -------------------------------------------
          HEADER
      ------------------------------------------- */}

      <header className="top-header">
        <div className="brand">
          <div className="brand-icon">
            <Music2 size={18} />
          </div>

          <span>Chill &amp; Enjoy</span>
        </div>

        <div className="header-center">
          <span className="status-dot" />

          {currentTheme ? `${currentTheme.name} mode` : "Your music space"}
        </div>

        <button
          className="header-button"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
        >
          <Expand size={18} />
        </button>
      </header>

      {/* -------------------------------------------
          MAIN CONTENT
      ------------------------------------------- */}

      <section
        className={`main-content ${
          showPlaylist ? "playlist-visible" : "playlist-hidden"
        }`}
      >
        {/* -----------------------------------------
            HERO
        ----------------------------------------- */}

        <div className="hero-section"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
          {/* THEME NAME */}

          {currentTheme && (
            <div className="theme-name">{currentTheme.name}</div>
          )}

          {/* THEME DOTS */}

          {themes.length > 1 && (
            <div className="theme-dots">
              {themes.map((theme, index) => (
                <button
                  key={theme.id}
                  className={
                    index === currentThemeIndex
                      ? "theme-dot active"
                      : "theme-dot"
                  }
                  onClick={() => setCurrentThemeIndex(index)}
                  aria-label={`Go to ${theme.name}`}
                  title={theme.name}
                />
              ))}
            </div>
          )}

          <div className="hero-label">
            <Headphones size={15} />

            <span>PUT YOUR HEADPHONES ON</span>
          </div>

          <h1>
            Chill
            <br />
            <span>&amp; Enjoy</span>
          </h1>

          <p className="hero-description">
            Relax, forget the noise and enjoy your favorite songs in your own
            little corner of the world.
          </p>

          {/* CURRENT SONG */}

          <div className="hero-current">
            <div className="mini-cover">
              <Music2 size={19} />
            </div>

            <div className="hero-current-text">
              <span>NOW PLAYING</span>

              <strong>{currentSong?.name ?? "Choose a song"}</strong>
            </div>
          </div>

          {/* MOBILE PLAYLIST BUTTON */}

          <button
            className="mobile-playlist-button"
            onClick={() => setMobilePlaylist(true)}
          >
            <ListMusic size={18} />

            <span>View playlist</span>

            <span className="mobile-song-count">{songs.length}</span>
          </button>
        </div>

        {/* -----------------------------------------
            DESKTOP PLAYLIST
        ----------------------------------------- */}

        {showPlaylist && (
          <aside className="playlist-panel glass-panel">
            <div className="playlist-top">
              <div>
                <div className="playlist-label">YOUR PLAYLIST</div>

                <h2>{currentTheme?.name ?? "My Songs"}</h2>
              </div>

              <div className="playlist-actions">
                <span>{songs.length} songs</span>

                <button
                  onClick={() => setShowPlaylist(false)}
                  className="small-icon"
                  aria-label="Hide playlist"
                  title="Hide playlist"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="song-list">
              {loading ? (
                <div className="empty-playlist">Loading songs...</div>
              ) : songs.length === 0 ? (
                <div className="empty-playlist">
                  <ListMusic size={30} />

                  <strong>No songs found</strong>

                  <span>Upload songs to your R2 bucket.</span>
                </div>
              ) : (
                songs.map((song, index) => {
                  const active = index === currentIndex;

                  return (
                    <button
                      key={song.file}
                      className={`song-item ${active ? "song-active" : ""}`}
                      onClick={() => playSong(index)}
                    >
                      <span className="song-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="song-icon">
                        {active && isPlaying ? (
                          <Volume2 size={15} />
                        ) : (
                          <Music2 size={15} />
                        )}
                      </span>

                      <span className="song-name">{song.name}</span>

                      <span className="song-play">
                        {active && isPlaying ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* -----------------------------------------
            SHOW PLAYLIST BUTTON
        ----------------------------------------- */}

        {!showPlaylist && (
          <button
            className="show-playlist-button"
            onClick={() => setShowPlaylist(true)}
          >
            <ListMusic size={17} />

            <span>Playlist</span>

            <ChevronLeft size={15} />
          </button>
        )}
      </section>

      {/* -------------------------------------------
          PLAYER
      ------------------------------------------- */}

      <section className="bottom-player glass-panel">
        {/* CURRENT SONG */}

        <div className="player-song">
          <div className={`player-cover ${isPlaying ? "cover-playing" : ""}`}>
            <Music2 size={22} />
          </div>

          <div className="player-song-info">
            <span>NOW PLAYING</span>

            <strong>{currentSong?.name ?? "Select a song"}</strong>
          </div>
        </div>

        {/* CONTROLS */}

        <div className="player-controls">
          <div className="control-buttons">
            {/* SHUFFLE */}

            <button
              className={`control-button ${isShuffle ? "control-active" : ""}`}
              onClick={() => setIsShuffle(!isShuffle)}
              title="Shuffle"
              aria-label="Shuffle"
            >
              <Shuffle size={18} />
            </button>

            {/* PREVIOUS SONG */}

            <button
              className="control-button"
              onClick={previousSong}
              aria-label="Previous song"
            >
              <SkipBack size={21} />
            </button>

            {/* PLAY */}

            <button
              className="main-play-button"
              onClick={togglePlay}
              aria-label="Play or pause"
            >
              {isPlaying ? (
                <Pause size={21} fill="currentColor" />
              ) : (
                <Play size={21} fill="currentColor" />
              )}
            </button>

            {/* NEXT SONG */}

            <button
              className="control-button"
              onClick={nextSong}
              aria-label="Next song"
            >
              <SkipForward size={21} />
            </button>

            {/* REPEAT */}

            <button
              className={`control-button ${isRepeat ? "control-active" : ""}`}
              onClick={() => setIsRepeat(!isRepeat)}
              title="Repeat"
              aria-label="Repeat"
            >
              <Repeat size={18} />
            </button>
          </div>

          {/* PROGRESS */}

          <div className="progress-container">
            <span>{formatTime(currentTime)}</span>

            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Song progress"
            />

            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* VOLUME */}

        <div className="volume-section">
          <button
            className="volume-button"
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            aria-label="Mute"
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
          />
        </div>
      </section>

      {/* -------------------------------------------
          MOBILE MINI PLAYER
      ------------------------------------------- */}

      <button
        className="mobile-mini-player"
        onClick={() => setMobilePlaylist(true)}
      >
        <div className="mini-player-cover">
          <Music2 size={17} />
        </div>

        <div className="mini-player-info">
          <span>{currentSong?.name ?? "Select a song"}</span>

          <small>{isPlaying ? "Playing" : "Paused"}</small>
        </div>

        <span
          className="mini-play"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          aria-label="Play or pause"
        >
          {isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </span>

        <span
          className="mini-next"
          onClick={(event) => {
            event.stopPropagation();
            nextSong();
          }}
          aria-label="Next song"
        >
          <SkipForward size={17} />
        </span>
      </button>

      {/* -------------------------------------------
          MOBILE PLAYLIST
      ------------------------------------------- */}

      {mobilePlaylist && (
        <div
          className="mobile-playlist-overlay"
          onClick={() => setMobilePlaylist(false)}
        >
          <div
            className="mobile-playlist-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div>
                <span>YOUR PLAYLIST</span>

                <h2>{currentTheme?.name ?? "My Songs"}</h2>
              </div>

              <button
                className="sheet-close"
                onClick={() => setMobilePlaylist(false)}
                aria-label="Close playlist"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-song-list">
              {songs.map((song, index) => {
                const active = index === currentIndex;

                return (
                  <button
                    key={song.file}
                    className={`mobile-song-item ${
                      active ? "mobile-song-active" : ""
                    }`}
                    onClick={() => selectMobileSong(index)}
                  >
                    <span className="mobile-song-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="mobile-song-art">
                      {active && isPlaying ? (
                        <Volume2 size={15} />
                      ) : (
                        <Music2 size={15} />
                      )}
                    </span>

                    <span className="mobile-song-name">{song.name}</span>

                    {active && (
                      <span>
                        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AUDIO */}

      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </main>
  );
}
