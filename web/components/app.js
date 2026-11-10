import { renderTracks } from "./track.js";
import "./player.js";

function selectTrack(trackId) {
  const track = playlist.find((track) => track.id === trackId);

  if (!track) return;

  // 1. Update the playlist highlight.
  const playlistContainer = document.getElementById("playlistContainer");

  playlistContainer
    .querySelector(".is-current")
    ?.classList.remove("is-current");

  playlistContainer
    .querySelector(`[data-track-id="${track.id}"]`)
    ?.classList.add("is-current");

  // 2. Update the listening room.
  const artwork = document
    .getElementById("nowPlayingContainer")
    .querySelector(".current-art");
  const metadata = document.getElementById("currentTrackMetadata");

  artwork.style.backgroundImage = `url('${track.artworkUrl}')`;

  metadata.replaceChildren();

  const title = document.createElement("strong");
  title.textContent = track.songName;

  const artist = document.createElement("span");
  artist.textContent = track.artistName;

  metadata.append(title, artist);
  // Set the artwork, song name, and artist using `track`.

  // 3. Later: notify the player module.
}

const playlist = [
  {
    id: "track_001",
    songName: "Example Song",
    artistName: "Example Artist",
    duration: 214,
    artworkUrl: "./assets/artwork/example.jpg"
  },
  {
    id: "track_002",
    songName: "Another Song",
    artistName: "Another Artist",
    duration: 185,
    artworkUrl: "./assets/theme/MagicForest.jpg"
  },
  {
    id: "track_003",
    songName: "Anoher Song",
    artistName: "Aother Artist",
    duration: 181,
    artworkUrl: "./assets/artwork/another.jpg"
  },
  {
    id: "track_004",
    songName: "Anotr Song",
    artistName: "Another tist",
    duration: 185,
    artworkUrl: "./assets/artwork/another.jpg"
  }
];

renderTracks(playlist, selectTrack);
