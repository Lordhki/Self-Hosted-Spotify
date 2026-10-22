// Keep these IDs and labels aligned with the palettes in style.css.
const themes = [
  { id: "starlight", label: "Starlight", color: "#07111f" },
  { id: "quiet", label: "Quiet", color: "#0b1712" },
  { id: "magic-forest", label: "Magic Forest", color: "#0b2e1a" },
];

const storageKey = "lowave-theme";
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
}

toggle.addEventListener("click", () => {
  const currentIndex = themes.findIndex(
    (theme) => theme.id === document.documentElement.dataset.theme,
  );
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  applyTheme(nextTheme.id);
});

applyTheme(readSavedTheme() || document.documentElement.dataset.theme);
