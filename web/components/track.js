export function renderTracks(tracks, onTrackSelect) {
  const playlistContainer = document.getElementById("playlistContainer");

  if (!playlistContainer) {
    console.error("Playlist container not found");
    return;
  }

  playlistContainer.replaceChildren();

  for (const track of tracks) {
    const item = document.createElement("li");
    item.className = "track-item";
    item.dataset.trackId = track.id;

    const row = document.createElement("button");
    row.className = "track-row";
    row.type = "button";

    // Report which track the user selected.

    row.addEventListener("click", () => {
      // Remove the highlight from the previously selected track.
      const currentTrack = playlistContainer.querySelector(".is-current");
      currentTrack?.classList.remove("is-current");

      // Highlight the newly selected track.
      item.classList.add("is-current");

      // Notify the caller which track was selected.
      onTrackSelect(track.id);
    });

    const artwork = document.createElement("img");
    artwork.className = "track-art";
    artwork.src = track.artworkUrl;
    artwork.alt = "";
    artwork.loading = "lazy";

    const copy = document.createElement("span");
    copy.className = "track-copy";

    const name = document.createElement("strong");
    name.textContent = track.songName;

    const artist = document.createElement("small");
    artist.textContent = track.artistName;

    const duration = document.createElement("span");
    duration.className = "track-duration";
    duration.textContent = formatDuration(track.duration);

    copy.append(name, artist);
    row.append(artwork, copy, duration);
    item.append(row);
    playlistContainer.append(item);
  }
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
