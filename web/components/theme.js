// Keep these IDs and labels aligned with the palettes in style.css.
const themes = [
  { id: "starlight", label: "Starlight", color: "#07111f" },
  { id: "quiet", label: "Quiet", color: "#0b1712" },
  { id: "magic-forest", label: "Magic Forest", color: "#0b2e1a" }
];

// One continuous wallpaper per theme.
// Each theme ID maps directly to one video source and playback rate.
const wallpapers = {
  starlight: {
    src: "assets/wallpaper/starlight/6.mp4",
    playbackRate: 0.1
  },

  quiet: {
    src: "assets/wallpaper/quiet/1.mp4",
    playbackRate: 0.5
  },

  "magic-forest": {
    src: "assets/wallpaper/magic-forest/1.mp4",
    playbackRate: 0.1
  }
};

const storageKey = "lowave-theme";

// Existing theme toggle elements.
const toggle = document.getElementById("theme-toggle");

if (!(toggle instanceof HTMLButtonElement)) {
  throw new Error("The theme toggle button is missing.");
}

const label = toggle.querySelector("[data-theme-label]");

if (!(label instanceof HTMLElement)) {
  throw new Error("The theme toggle label is missing.");
}

const themeColor = document.querySelector('meta[name="theme-color"]');

if (!(themeColor instanceof HTMLMetaElement)) {
  throw new Error("The theme-color metadata element is missing.");
}

// Use one persistent video element.
// Keep the existing wallpaper-layer HTML, but only use the first layer.
const wallpaperLayer = document.querySelector(".video-panel .wallpaper-layer");

if (!(wallpaperLayer instanceof HTMLElement)) {
  throw new Error("The wallpaper layer is missing.");
}

let wallpaperVideo = wallpaperLayer.querySelector("video");
let currentWallpaper = null;

// Create the video only once.
if (!wallpaperVideo) {
  wallpaperVideo = document.createElement("video");

  wallpaperVideo.muted = true;
  wallpaperVideo.defaultMuted = true;
  wallpaperVideo.loop = true;
  wallpaperVideo.autoplay = true;
  wallpaperVideo.playsInline = true;
  wallpaperVideo.preload = "auto";
  wallpaperVideo.setAttribute("aria-hidden", "true");
  wallpaperVideo.tabIndex = -1;

  wallpaperLayer.appendChild(wallpaperVideo);
}

// Theme helpers.
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

// Switch the wallpaper only when its source changes.
async function setWallpaper(themeId) {
  const wallpaper = wallpapers[themeId];

  if (!wallpaper) {
    console.warn("No wallpaper configured for theme:", themeId);
    return;
  }

  if (currentWallpaper !== wallpaper.src) {
    currentWallpaper = wallpaper.src;

    wallpaperVideo.pause();
    wallpaperVideo.src = wallpaper.src;
    wallpaperVideo.playbackRate = wallpaper.playbackRate ?? 1;
    wallpaperVideo.load();
  }

  // Don't attempt playback while the page is hidden.
  if (document.hidden) {
    return;
  }

  try {
    await wallpaperVideo.play();
  } catch (error) {
    console.warn("Unable to play living wallpaper.", error);
  }
}

// Apply the selected theme and its corresponding wallpaper.
function applyTheme(id) {
  const theme = findTheme(id);
  const currentIndex = themes.indexOf(theme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];

  document.documentElement.dataset.theme = theme.id;
  label.textContent = theme.label;

  toggle.setAttribute("aria-label", `Switch to ${nextTheme.label} theme`);

  toggle.title = `Switch to ${nextTheme.label} theme`;
  themeColor.content = theme.color;

  saveTheme(theme.id);
  setWallpaper(theme.id);
}

// Pause and resume the same video when the page visibility changes.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    wallpaperVideo.pause();
    return;
  }

  wallpaperVideo.play().catch((error) => {
    console.warn("Unable to resume living wallpaper playback.", error);
  });
});

// Theme toggle.
toggle.addEventListener("click", () => {
  const currentIndex = themes.findIndex(
    (theme) => theme.id === document.documentElement.dataset.theme
  );

  const nextTheme = themes[(currentIndex + 1) % themes.length];

  applyTheme(nextTheme.id);
});

// Initialize the saved theme and its wallpaper.
applyTheme(readSavedTheme() || document.documentElement.dataset.theme);
