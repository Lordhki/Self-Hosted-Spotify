(() => {
  // Resource URLs are relative to this script, so both /web/main_menu.html and a
  // server rooted at web/ work without special routes or a build step.
  const resourceBase = new URL("../", document.currentScript.src);
  const themes = [
    {
      id: "starlight", label: "Starlight", color: "#07111f",
      stylesheet: "themes/starlight/ui.css",
      wallpaper: { src: "assets/wallpaper/starlight/6.mp4", playbackRate: 0.1 }
    },
    {
      id: "quiet", label: "Quiet", color: "#0b1712",
      stylesheet: "themes/quiet/ui.css",
      wallpaper: { src: "assets/wallpaper/quiet/1.mp4", playbackRate: 0.5 }
    },
    {
      id: "magic-forest", label: "Magic Forest", color: "#0b2e1a",
      stylesheet: "themes/magic-forest/ui.css",
      wallpaper: { src: "assets/wallpaper/magic-forest/1.mp4", playbackRate: 0.1 }
    }
  ];
  const storageKey = "lowave-theme";
  const loadTimeout = 5000;
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');

  // Only activeTheme is authoritative. data-theme, labels, storage and wallpaper
  // are projections updated together after a successful stylesheet load.
  let activeTheme = null;
  let activeStylesheet = null;
  let pendingLoad = null;
  let toggle = null;
  let label = null;
  let wallpaperVideo = null;
  let currentWallpaper = null;
  let controlsReady = false;

  function findTheme(id) {
    return themes.find((theme) => theme.id === id) || themes[0];
  }

  function readSavedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      console.warn("Unable to read the saved theme preference.", error);
      return null;
    }
  }

  function saveTheme(id) {
    try {
      localStorage.setItem(storageKey, id);
    } catch (error) {
      console.warn("Unable to save the theme preference.", error);
    }
  }

  function updateControls() {
    if (!toggle || !activeTheme) return;

    const nextTheme = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
    label.textContent = activeTheme.label;
    toggle.setAttribute("aria-label", `Switch to ${nextTheme.label} theme`);
    toggle.title = `Switch to ${nextTheme.label} theme`;
    toggle.setAttribute("aria-busy", String(Boolean(pendingLoad)));
  }

  async function playWallpaper() {
    if (!wallpaperVideo || document.hidden) return;

    try {
      await wallpaperVideo.play();
    } catch (error) {
      // A newer source can interrupt an outstanding play() during rapid toggles.
      if (error.name !== "AbortError") {
        console.warn("Unable to play living wallpaper.", error);
      }
    }
  }

  function setWallpaper() {
    if (!wallpaperVideo || !activeTheme) return;

    const { src, playbackRate } = activeTheme.wallpaper;
    if (currentWallpaper !== src) {
      currentWallpaper = src;
      wallpaperVideo.pause();
      wallpaperVideo.src = new URL(src, resourceBase).href;
      wallpaperVideo.defaultPlaybackRate = playbackRate;
      wallpaperVideo.playbackRate = playbackRate;
      wallpaperVideo.load();
    }
    playWallpaper();
  }

  function commitTheme(theme, stylesheet) {
    const previousStylesheet = activeStylesheet;
    // The replacement is already downloaded. These synchronous changes complete
    // before the next paint, with no frame containing a half-applied palette.
    if (stylesheet) {
      stylesheet.media = "all";
    }
    activeTheme = theme;
    activeStylesheet = stylesheet;
    root.dataset.theme = theme.id;
    previousStylesheet?.remove();
    if (stylesheet) stylesheet.id = "theme-stylesheet";
    if (themeColor) themeColor.content = theme.color;
    updateControls();
    saveTheme(theme.id);
    setWallpaper();
    if (controlsReady) root.removeAttribute("data-theme-loading");
  }

  function applyTheme(id) {
    const theme = findTheme(id);
    if (pendingLoad?.theme === theme) return pendingLoad.promise;
    pendingLoad?.cancel();
    if (activeTheme === theme && activeStylesheet) {
      updateControls();
      return Promise.resolve(true);
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(theme.stylesheet, resourceBase).href;
    // Load without contributing any declarations to the current palette.
    stylesheet.media = "not all";

    let resolveLoad;
    const promise = new Promise((resolve) => { resolveLoad = resolve; });
    let settled = false;
    const request = { theme, promise, cancel: () => finish(false) };
    function finish(loaded, failed = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stylesheet.onload = null;
      stylesheet.onerror = null;
      if (pendingLoad === request) pendingLoad = null;
      if (loaded) {
        commitTheme(theme, stylesheet);
      } else {
        stylesheet.remove();
        updateControls();
        if (failed) console.warn(`Unable to load ${theme.label} theme stylesheet; keeping the current palette.`);
      }
      resolveLoad(loaded);
    }
    const timeout = setTimeout(() => finish(false, true), loadTimeout);
    stylesheet.onload = () => finish(true);
    stylesheet.onerror = () => finish(false, true);
    pendingLoad = request;
    updateControls();
    document.head.appendChild(stylesheet);
    return promise;
  }

  function initializeControls() {
    controlsReady = true;
    toggle = document.getElementById("theme-toggle");
    label = toggle?.querySelector("[data-theme-label]");
    const wallpaperLayer = document.querySelector(".video-panel .wallpaper-layer");
    if (!(toggle instanceof HTMLButtonElement) || !(label instanceof HTMLElement) || !wallpaperLayer) {
      console.warn("Theme controls or wallpaper layer are missing.");
      toggle = null;
      label = null;
      if (activeTheme) root.removeAttribute("data-theme-loading");
      return;
    }

    // Keep the existing layer and one persistent video element.
    wallpaperVideo = wallpaperLayer.querySelector("video") || document.createElement("video");
    wallpaperVideo.muted = true;
    wallpaperVideo.defaultMuted = true;
    wallpaperVideo.loop = true;
    wallpaperVideo.autoplay = true;
    wallpaperVideo.playsInline = true;
    wallpaperVideo.preload = "auto";
    wallpaperVideo.setAttribute("aria-hidden", "true");
    wallpaperVideo.tabIndex = -1;
    if (!wallpaperVideo.parentElement) wallpaperLayer.appendChild(wallpaperVideo);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) wallpaperVideo.pause();
      else playWallpaper();
    });
    toggle.addEventListener("click", () => {
      // Rapid clicks advance from the requested selection; stale loads are cancelled.
      const selected = pendingLoad?.theme || activeTheme || themes[0];
      applyTheme(themes[(themes.indexOf(selected) + 1) % themes.length].id);
    });
    updateControls();
    setWallpaper();
    if (activeTheme) root.removeAttribute("data-theme-loading");
  }

  // This script runs in <head>. Reveal the first frame only after the saved UI
  // palette is ready, or after a bounded fallback if resources fail to load.
  root.setAttribute("data-theme-loading", "");
  const initialTheme = findTheme(readSavedTheme() || root.dataset.theme);
  applyTheme(initialTheme.id).then(async (loaded) => {
    if (loaded || activeTheme || pendingLoad) return;
    if (initialTheme !== themes[0] && await applyTheme(themes[0].id)) return;
    // If even the default stylesheet fails, the complete neutral token contract
    // keeps the app usable. The next toggle can retry loading a theme.
    if (!activeTheme && !pendingLoad) commitTheme(themes[0], null);
  });
  document.addEventListener("DOMContentLoaded", initializeControls, { once: true });
})();
