import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import WindowTitlebar from "./components/WindowTitlebar";
import { storage, STORAGE_KEYS } from "./utils/storage";
import { applyAccentColor } from "./utils/appearance";
import { collectBackupData } from "./utils/backup";
import { fetchLatestShows, fetchPopularShows } from "./utils/api";
import { clearAppCaches } from "./utils/storage";

import Sidebar from "./components/Sidebar";
import SearchModal from "./components/SearchModal";
import CloseConfirmModal from "./components/CloseConfirmModal";
import UpdateModal from "./components/UpdateModal";

// Lazy-loaded pages: each chunk is only downloaded when the user first visits
const HomePage = lazy(() => import("./pages/HomePage"));
const MoviePage = lazy(() => import("./pages/MoviePage"));
const TVPage = lazy(() => import("./pages/TVPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
import { checkForUpdates } from "./utils/updates";

export default function App() {
  const [page, setPage] = useState(() => storage.get("startPage") || "home");
  const [selected, setSelected] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [dlSearchOpen, setDlSearchOpen] = useState(false);
  const [librarySort, setLibrarySort] = useState(
    () => storage.get(STORAGE_KEYS.LIBRARY_SORT) || "manual",
  );
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [platform, setPlatform] = useState(null);

  // Navigation history stack for Ctrl+Z back navigation
  const [navStack, setNavStack] = useState([]);

  // Reset saved data for new API (uses URL-based identifiers now)
  const [saved, setSaved] = useState(() => {
    // Clear old TMDB-based saved data on first load
    const existing = storage.get("saved");
    if (existing && Object.keys(existing).some(k => k.match(/^(movie|tv)_\d+$/))) {
      storage.set("saved", {});
      storage.set("savedOrder", null);
      return {};
    }
    return existing || {};
  });
  // Separate order array for drag-and-drop reordering
  const [savedOrder, setSavedOrder] = useState(
    () => storage.get("savedOrder") || null,
  );
  const [progress, setProgress] = useState(() => {
    // Clear old TMDB-based progress data
    const existing = storage.get("progress");
    if (existing && Object.keys(existing).some(k => k.match(/^(movie|tv)_\d+/))) {
      storage.set("progress", {});
      return {};
    }
    return existing || {};
  });
  const [history, setHistory] = useState(() => {
    // Clear old TMDB-based history
    const existing = storage.get("history");
    if (existing && existing.some(h => typeof h.id === 'number')) {
      storage.set("history", []);
      return [];
    }
    return existing || [];
  });
  const [watched, setWatched] = useState(() => {
    // Clear old TMDB-based watched data
    const existing = storage.get("watched");
    if (existing && Object.keys(existing).some(k => k.match(/^(movie|tv)_\d+/))) {
      storage.set("watched", {});
      return {};
    }
    return existing || {};
  });
  const [toast, setToast] = useState(null);
  const [updateBanner, setUpdateBanner] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [latestShows, setLatestShows] = useState([]);
  const [popularShows, setPopularShows] = useState([]);
  const [loadingHome, setLoadingHome] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  // ── Scheduled backup: run on startup if due ─────────────────────────────────
  useEffect(() => {
    if (!window.electron?.onScheduledBackupRequested) return;
    const handler = window.electron.onScheduledBackupRequested(async () => {
      try {
        const settings = await window.electron.getScheduledBackupSettings();
        if (!settings?.enabled || !settings?.path) return;
        const data = collectBackupData();
        await window.electron.performScheduledBackup({ data, settings });
      } catch {
        // silently ignore errors on scheduled backup
      }
    });
    return () => window.electron.offScheduledBackupRequested(handler);
  }, []);

  // ── Post-update cache flush ───────────────────────────────────────────────
  // On every start, compare the running version against the last-seen version.
  // If they differ the app was just updated -> clear all caches to prevent problems
  useEffect(() => {
    if (!window.electron?.getAppVersion) return;
    window.electron.getAppVersion().then((version) => {
      const lastVersion = localStorage.getItem("streambert_lastVersion");
      if (lastVersion && lastVersion !== version) {
        clearAppCaches();
      }
      localStorage.setItem("streambert_lastVersion", version);
    });
  }, []);

  // ── Startup update check ─────────────────────────────────────────────────
  useEffect(() => {
    if (!storage.get("autoCheckUpdates")) return;
    checkForUpdates()
      .then((r) => {
        if (r.hasUpdate) setUpdateBanner(r);
      })
      .catch(() => {}); // silently ignore network errors on startup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Downloads state ──────────────────────────────────────────────────────
  const [downloads, setDownloads] = useState([]);
  const [highlightDownload, setHighlightDownload] = useState(null);
  const [closeConfirm, setCloseConfirm] = useState(null); // { count }

  // ── Detect platform for Windows titlebar ──────────────────────────────────
  useEffect(() => {
    if (!window.electron?.getPlatform) return;
    let mounted = true;
    window.electron.getPlatform().then((p) => {
      if (!mounted) return;
      setPlatform(p);
      if (p === "win32" || p === "linux") {
        document.documentElement.setAttribute("data-win-titlebar", "1");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for close confirmation request from main process
  useEffect(() => {
    if (!window.electron) return;
    const handler = window.electron.onConfirmClose((data) =>
      setCloseConfirm(data),
    );
    return () => window.electron.offConfirmClose(handler);
  }, []);

  // Load persisted downloads on startup + immediately prune missing files
  useEffect(() => {
    if (!window.electron) return;
    let mounted = true;
    window.electron.getDownloads().then(async (list) => {
      if (!mounted || !Array.isArray(list)) return;

      const pruned = [...list];
      const toRemove = new Set();

      await Promise.all(
        pruned.map(async (d) => {
          if (d.status !== "completed" || !d.filePath) return;
          const exists = await window.electron.fileExists(d.filePath);
          if (!exists) {
            // File gone, remove from registry silently
            window.electron.deleteDownload({ id: d.id, filePath: null });
            toRemove.add(d.id);
            return;
          }
          // Prune subtitle paths that no longer exist
          if (
            d.subtitlePaths?.length > 0 &&
            window.electron.pruneSubtitlePaths
          ) {
            const res = await window.electron.pruneSubtitlePaths(d.id);
            if (res?.ok) d.subtitlePaths = res.subtitlePaths;
          }
        }),
      );

      if (mounted) setDownloads(pruned.filter((d) => !toRemove.has(d.id)));
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for live progress events from main process
  useEffect(() => {
    if (!window.electron) return;
    const handler = window.electron.onDownloadProgress((update) => {
      // ── Desktop notification ──────────────────────
      if (
        update.status === "completed" &&
        storage.get(STORAGE_KEYS.NOTIFY_DOWNLOAD_COMPLETE) !== false &&
        window.electron.showNotification
      ) {
        window.electron.showNotification({
          title: "Download complete",
          body: update.name || "Your download has finished.",
          silent: false,
        });
      }

      setDownloads((prev) => {
        const idx = prev.findIndex((d) => d.id === update.id);
        if (idx === -1) {
          // Unknown id: either the entry was deleted (stale event after SIGKILL)
          // or a genuine race on first event.
          if (!update.name) return prev;
          return [update, ...prev];
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...update };
        return updated;
      });
    });
    return () => window.electron.offDownloadProgress(handler);
  }, []);

  const handleDownloadStarted = useCallback((newEntry) => {
    setDownloads((prev) => {
      // Guard: if a progress event already added this id (race), just update it
      const idx = prev.findIndex((d) => d.id === newEntry.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...newEntry };
        return updated;
      }
      return [newEntry, ...prev];
    });
  }, []);

  const handleDeleteDownload = useCallback((id) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Active download count for sidebar badge
  const activeDownloadCount = useMemo(
    () => downloads.filter((d) => d.status === "downloading").length,
    [downloads],
  );

  // ── Home page data fetch ────────────────────────────────────────────────
  // Results are cached in localStorage for 30 min to avoid redundant API calls
  const fetchHomeData = useCallback(() => {
    const cached = storage.get("homeDataCache");
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
      setLatestShows(cached.latest || []);
      setPopularShows(cached.popular || []);
      return;
    }
    setLoadingHome(true);
    Promise.all([
      fetchLatestShows(),
      fetchPopularShows(),
    ])
      .then(([latestRes, popularRes]) => {
        const latest = latestRes?.data || [];
        const popular = popularRes?.data || [];
        setLatestShows(latest);
        setPopularShows(popular);
        storage.set("homeDataCache", { latest, popular, ts: Date.now() });
      })
      .catch(() => {})
      .finally(() => setLoadingHome(false));
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const retryHome = useCallback(() => {
    if (offline) return;
    fetchHomeData();
  }, [offline, fetchHomeData]);

  // ── Sync librarySort when changed from Settings ───────────────────────────
  useEffect(() => {
    const handler = (e) => setLibrarySort(e.detail);
    window.addEventListener("streambert:library-sort-changed", handler);
    return () =>
      window.removeEventListener("streambert:library-sort-changed", handler);
  }, []);
  useEffect(() => {
    // Accent colour
    const accent = storage.get(STORAGE_KEYS.ACCENT_COLOR) || "red";
    applyAccentColor(accent);
    // Font size
    const font = storage.get(STORAGE_KEYS.FONT_SIZE) || "normal";
    const zoomMap = { sm: 0.85, normal: 1, lg: 1.15 };
    const factor = zoomMap[font] ?? 1;
    if (window.electron?.setZoomFactor) window.electron.setZoomFactor(factor);
    // Compact mode
    const compact = !!storage.get(STORAGE_KEYS.COMPACT_MODE);
    document.body.classList.toggle("compact-mode", compact);
    // Reduce animations
    const noAnim = !!storage.get(STORAGE_KEYS.REDUCE_ANIMATIONS);
    document.body.classList.toggle("no-anim", noAnim);
  }, []);
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  // Refs so navigate/navigateBack never need page/selected as deps
  const pageRef = useRef(page);
  const selectedRef = useRef(selected);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const navigateBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPage(last.page);
      setSelected(last.selected);
      if (typeof gc === "function") {
        requestIdleCallback(() => gc(), { timeout: 2000 });
      }
      return prev.slice(0, -1);
    });
  }, []);

  const navigate = useCallback((pg, data = null) => {
    setNavStack((prev) => [
      ...prev,
      { page: pageRef.current, selected: selectedRef.current },
    ]);
    setSelected(data);
    setPage(pg);
    setShowSearch(false);
    // After navigating away, the previous page's component unmounts
    if (typeof gc === "function") {
      requestIdleCallback(() => gc(), { timeout: 2000 });
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (pageRef.current === "downloads") {
          e.preventDefault();
          setDlSearchOpen(true);
        }
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowShortcuts(false);
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target?.tagName || "").toUpperCase();
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          setShowShortcuts((v) => !v);
        }
      }
      // Ctrl+Z / Cmd+Z → navigate back
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        navigateBack();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigateBack]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const getMediaType = useCallback(
    (item) => item.media_type || (item.first_air_date ? "tv" : "movie"),
    [],
  );

  const handleSelectResult = useCallback(
    (item) => {
      navigate(item.media_type === "tv" ? "tv" : "movie", item);
    },
    [navigate],
  );

  const saveApiKey = useCallback((key) => {
    secureStorage.set("apikey", key);
    setApiKey(key);
  }, []);

  const changeApiKey = useCallback(() => {
    secureStorage.set("apikey", "");
    setApiKey(null);
    setApiKeyLoaded(true);
    setSkipped(false);
  }, []);

  // Ref so toggleSave never needs `saved` as a dep (avoids recreation on every save)
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const toggleSave = useCallback(
    (item) => {
      const mt = getMediaType(item);
      const id = `${mt}_${item.id}`;
      const currentSaved = savedRef.current;
      const isRemoving = !!currentSaved[id];
      const next = { ...currentSaved };

      if (isRemoving) {
        delete next[id];
        showToast("Removed from watchlist");
        setSavedOrder((prev) => {
          const currentOrder = prev || Object.keys(currentSaved);
          const newOrder = currentOrder.filter((k) => k !== id);
          storage.set("savedOrder", newOrder);
          return newOrder;
        });
      } else {
        next[id] = {
          id: item.id,
          title: item.title || item.name,
          poster_path: item.poster_path,
          media_type: mt,
          vote_average: item.vote_average,
          year: (item.release_date || item.first_air_date || "").slice(0, 4),
        };
        showToast("Added to watchlist");
        setSavedOrder((prev) => {
          const currentOrder = prev || Object.keys(currentSaved);
          const newOrder = [...currentOrder, id];
          storage.set("savedOrder", newOrder);
          return newOrder;
        });
      }
      setSaved(next);
      storage.set("saved", next);
    },
    [showToast, getMediaType],
  );

  const isSaved = useCallback(
    (item) => {
      const id = `${getMediaType(item)}_${item.id}`;
      return !!saved[id];
    },
    [saved, getMediaType],
  );

  const addHistory = useCallback((item) => {
    // Respect the "disable watch history" setting
    const historyEnabled = storage.get(STORAGE_KEYS.HISTORY_ENABLED);
    if (historyEnabled === 0 || historyEnabled === false) return;
    const entry = {
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: getMediaType(item),
      watchedAt: Date.now(),
      // Store as numbers so the progress key always matches exactly
      season: item.season != null ? Number(item.season) : null,
      episode: item.episode != null ? Number(item.episode) : null,
      episodeName: item.episodeName || null,
    };
    // Functional update - never reads stale history from closure
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => !(h.id === entry.id && h.media_type === entry.media_type),
      );
      const next = [entry, ...filtered].slice(0, 50);
      storage.set("history", next);
      return next;
    });
  }, []); // no deps needed

  const saveProgress = useCallback((key, pct) => {
    // Functional update - without this, TVPage's setInterval keeps spreading
    // the progress object from when the interval was created, overwriting
    // saves from other episodes (classic stale closure bug).
    setProgress((prev) => {
      if (prev[key] === pct) return prev; // no change - skip write
      const next = { ...prev, [key]: pct };
      storage.set("progress", next);
      return next;
    });
  }, []); // no deps needed

  const markWatched = useCallback((key) => {
    setWatched((prev) => {
      const next = { ...prev, [key]: true };
      storage.set("watched", next);
      return next;
    });
  }, []);

  const markUnwatched = useCallback((key) => {
    setWatched((prev) => {
      const next = { ...prev };
      delete next[key];
      storage.set("watched", next);
      return next;
    });
  }, []);

  // Memoized, avoids re-filtering on every download-progress event
  // Pre-compute progress keys for history items once; only re-runs when history changes.
  const historyWithKeys = useMemo(
    () =>
      history
        .filter((h) => {
          if (h.media_type === "tv" && (h.season == null || h.episode == null))
            return false;
          return true;
        })
        .map((h) => ({
          ...h,
          _pk:
            h.media_type === "movie"
              ? `movie_${h.id}`
              : `tv_${h.id}_s${h.season}e${h.episode}`,
        })),
    [history],
  );

  // Filter by progress/watched
  const inProgress = useMemo(
    () =>
      historyWithKeys.filter((h) => {
        if (watched[h._pk]) return false;
        const pct = progress[h._pk];
        return pct != null && pct > 2 && pct < 98;
      }),
    [historyWithKeys, progress, watched],
  );

  // Memoized, avoids re-mapping on every download-progress event
  const savedList = useMemo(() => {
    const orderedKeys = savedOrder
      ? savedOrder.filter((k) => saved[k])
      : Object.keys(saved);
    const list = orderedKeys.map((k) => saved[k]).filter(Boolean);
    if (librarySort === "title")
      return [...list].sort((a, b) =>
        (a.title || "").localeCompare(b.title || ""),
      );
    if (librarySort === "rating")
      return [...list].sort(
        (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
      );
    if (librarySort === "year")
      return [...list].sort((a, b) =>
        (b.year || "").localeCompare(a.year || ""),
      );
    return list;
  }, [saved, savedOrder, librarySort]);

  const handleReorderSaved = useCallback((newOrder) => {
    setSavedOrder(newOrder);
    storage.set("savedOrder", newOrder);
  }, []);

  // Stable handler
  const handleGoToDownloads = useCallback(
    (id) => {
      setHighlightDownload(id || null);
      navigate("downloads");
    },
    [navigate],
  );

  if (!apiKeyLoaded) return null; // wait for secure storage to resolve
  if (!apiKey && !skipped)
    return <SetupScreen onSave={saveApiKey} onSkip={() => setSkipped(true)} />;

  const hasCustomTitlebar = platform === "win32" || platform === "linux";

  return (
    <ErrorBoundary>
      {hasCustomTitlebar && <WindowTitlebar />}
      <div>
        <Sidebar
          page={page}
          onNavigate={navigate}
          onSearch={() => setShowSearch(true)}
          savedList={savedList}
          activeDownloads={activeDownloadCount}
          onReorderSaved={handleReorderSaved}
          onRemoveSaved={toggleSave}
          canGoBack={navStack.length > 0}
          onBack={navigateBack}
          onShowShortcuts={() => setShowShortcuts(true)}
        />

        <div className="main">
          {/* ── API key status banner ── */}
          {/* Suspense boundary: lazy page chunks are fetched on first visit */}
          {apiKeyStatus === "invalid_token" && (
            <div className="api-status-banner api-status-error">
              <span>
                ⚠ Your TMDB token is invalid, not set or has been revoked.
                Movies and shows won't load.
              </span>
              <button className="api-status-btn" onClick={changeApiKey}>
                Update Token
              </button>
            </div>
          )}
          {apiKeyStatus === "unreachable" && (
            <div className="api-status-banner api-status-warn">
              <span>
                ⚠ Cannot reach TMDB, check your internet connection. Content may
                not load.
              </span>
              <button
                className="api-status-btn"
                onClick={() =>
                  setApiKeyStatus("checking") || window.location.reload()
                }
              >
                Retry
              </button>
            </div>
          )}
          <Suspense
            fallback={
              <div
                style={{
                  color: "var(--text2)",
                  padding: 48,
                  textAlign: "center",
                  fontSize: 15,
                }}
              >
                Laden…
              </div>
            }
          >
            {page === "home" && (
              <HomePage
                trending={trending}
                trendingTV={trendingTV}
                loading={loadingHome}
                onSelect={handleSelectResult}
                progress={progress}
                inProgress={inProgress}
                offline={offline}
                onRetry={retryHome}
                watched={watched}
                onMarkWatched={markWatched}
                onMarkUnwatched={markUnwatched}
                history={history}
                apiKey={apiKey}
              />
            )}
            {page === "movie" && selected && (
              <MoviePage
                item={selected}
                apiKey={apiKey}
                onSave={() => toggleSave(selected)}
                isSaved={isSaved(selected)}
                onHistory={addHistory}
                progress={progress}
                saveProgress={saveProgress}
                onBack={() => navigate("home")}
                onSettings={(section) =>
                  navigate("settings", { section: section || null })
                }
                onDownloadStarted={handleDownloadStarted}
                watched={watched}
                onMarkWatched={markWatched}
                onMarkUnwatched={markUnwatched}
                downloads={downloads}
                onGoToDownloads={handleGoToDownloads}
                onSelect={handleSelectResult}
              />
            )}
            {page === "tv" && selected && (
              <TVPage
                item={selected}
                apiKey={apiKey}
                onSave={() => toggleSave(selected)}
                isSaved={isSaved(selected)}
                onHistory={addHistory}
                progress={progress}
                saveProgress={saveProgress}
                onBack={() => navigate("home")}
                onSettings={(section) =>
                  navigate("settings", { section: section || null })
                }
                onDownloadStarted={handleDownloadStarted}
                watched={watched}
                onMarkWatched={markWatched}
                onMarkUnwatched={markUnwatched}
                downloads={downloads}
                onGoToDownloads={handleGoToDownloads}
              />
            )}
            {page === "history" && (
              <LibraryPage
                history={history}
                inProgress={inProgress}
                saved={savedList}
                progress={progress}
                onSelect={handleSelectResult}
                watched={watched}
                onMarkWatched={markWatched}
                onMarkUnwatched={markUnwatched}
              />
            )}
            {page === "settings" && (
              <SettingsPage
                apiKey={apiKey}
                onChangeApiKey={changeApiKey}
                initialSection={selected?.section}
              />
            )}
            {page === "downloads" && (
              <DownloadsPage
                downloads={downloads}
                onDeleteDownload={handleDeleteDownload}
                onHistory={addHistory}
                onSaveProgress={saveProgress}
                progress={progress}
                watched={watched}
                onMarkWatched={markWatched}
                onMarkUnwatched={markUnwatched}
                highlightId={highlightDownload}
                onClearHighlight={() => setHighlightDownload(null)}
                onSelect={handleSelectResult}
                searchOpen={dlSearchOpen}
                onSearchClose={() => setDlSearchOpen(false)}
                onSettings={(section) =>
                  navigate("settings", { section: section || null })
                }
                onUpdateDownload={(id, updates) =>
                  setDownloads((prev) =>
                    prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
                  )
                }
              />
            )}
          </Suspense>
        </div>

        {showSearch && (
          <SearchModal
            apiKey={apiKey}
            onSelect={handleSelectResult}
            onClose={() => setShowSearch(false)}
            offline={offline}
          />
        )}
        {updateBanner && (
          <div
            style={{
              position: "fixed",
              top: hasCustomTitlebar ? 32 : 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: "rgba(229,9,20,0.92)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "10px 24px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
            }}
          >
            <span>🎉 Streambert v{updateBanner.latest} is available!</span>
            <button
              onClick={() => setShowUpdateModal(true)}
              style={{
                color: "#fff",
                fontWeight: 700,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Install Update
            </button>
            <button
              onClick={() => setUpdateBanner(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: "0 4px",
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        {showUpdateModal && updateBanner && (
          <UpdateModal
            updateInfo={updateBanner}
            activeDownloads={activeDownloadCount}
            onClose={() => setShowUpdateModal(false)}
          />
        )}
        {toast && <div className="toast">{toast}</div>}

        {/* ── Episode check status pill / result card ── */}
        {episodeCheckStatus && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "calc(var(--sidebar) + 24px)",
              zIndex: 500,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              animation: "slideUp 0.3s ease",
              minWidth: 260,
              maxWidth: 400,
            }}
          >
            {episodeCheckStatus === "checking" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 18px",
                  fontSize: 14,
                  color: "var(--text2)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid var(--text3)",
                    borderTopColor: "var(--red)",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                  }}
                />
                Checking for new episodes…
              </div>
            )}

            {episodeCheckStatus === "none" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 18px",
                  fontSize: 14,
                  color: "var(--text3)",
                }}
              >
                <span style={{ fontSize: 16 }}>✓</span>
                No new episodes found
              </div>
            )}

            {episodeCheckStatus?.entries && (
              <div style={{ padding: "14px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <span style={{ color: "var(--red)", fontSize: 15 }}>
                      🎬
                    </span>
                    New episode
                    {episodeCheckStatus.entries.length > 1 ? "s" : ""} available
                  </div>
                  <button
                    onClick={() => {
                      clearTimeout(episodeDismissTimerRef.current);
                      setEpisodeCheckStatus(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text3)",
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                      padding: "0 2px",
                    }}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {episodeCheckStatus.entries.slice(0, 5).map((entry) => (
                    <li
                      key={entry.id}
                      className="episode-check-item"
                      onClick={() => {
                        clearTimeout(episodeDismissTimerRef.current);
                        navigate("tv", {
                          ...entry.seriesItem,
                          season: entry.season ?? 1,
                        });
                        setEpisodeCheckStatus(null);
                      }}
                      style={{
                        fontSize: 13,
                        color: "var(--text2)",
                        padding: "5px 0",
                        paddingBottom: 7,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 4,
                        transition: "color 0.15s",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.title}
                      </span>
                      {entry.season != null && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text3)",
                            background: "var(--surface3)",
                            borderRadius: 4,
                            padding: "1px 6px",
                            flexShrink: 0,
                          }}
                        >
                          Season {entry.season}
                        </span>
                      )}
                    </li>
                  ))}
                  {episodeCheckStatus.entries.length > 5 && (
                    <li
                      style={{
                        fontSize: 12,
                        color: "var(--text3)",
                        paddingTop: 2,
                      }}
                    >
                      +{episodeCheckStatus.entries.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
        {closeConfirm && (
          <CloseConfirmModal
            count={closeConfirm.count}
            onConfirm={() => {
              setCloseConfirm(null);
              window.electron.respondClose(true);
            }}
            onCancel={() => {
              setCloseConfirm(null);
              window.electron.respondClose(false);
            }}
          />
        )}
        {showShortcuts && (
          <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
