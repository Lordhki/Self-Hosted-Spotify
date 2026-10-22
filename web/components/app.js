import { renderTracks } from "./track.js";
import "./player.js";

const tracks = [
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
    artworkUrl: "./assets/artwork/another.jpg"
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

renderTracks(tracks, (trackId) => {
  console.log("Selected track ID:", trackId);
});
