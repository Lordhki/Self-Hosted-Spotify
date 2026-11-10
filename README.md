# Self-Hosted Spotify

A self-hosted music listening-room prototype inspired by Spotify. The current repository focuses on the web experience and defines the API contract that will connect the interface to a future music service.

## Current progress

**Status as of 2026-11-10:** frontend prototype in active development.

Implemented:

- Responsive listening-room layout for different screen sizes.
- Playlist track rendering and track selection state.
- Current-track artwork, title, and artist updates in the listening view.
- Three selectable themes: **Starlight**, **Quiet**, and **Magic Forest**.
- Persistent theme preference using `localStorage`.
- Theme-specific living wallpaper videos with visibility-aware pause/resume behavior.
- Range-slider fill styling for player controls.
- OpenAPI 3.1 contract for playlists, playlist tracks, and track audio streaming.

Not yet implemented:

- Backend service and API routes described by `api-contract.yaml`.
- Real playlist and track data from the API; the UI currently uses sample data.
- Audio playback, queue, shuffle, repeat, seeking, and volume integration.
- Authentication, persistence, deployment configuration, and automated tests.
- Final artwork assets referenced by some sample tracks.

## Project structure

```text
.
├── api-contract.yaml       # OpenAPI 3.1 contract for the planned backend API
├── cpp/
│   ├── main.cpp            # Minimal C++ environment smoke test
│   └── main.exe            # Compiled smoke-test executable
├── web/
│   ├── main_menu.html      # Listening-room page markup
│   ├── style.css           # Layout, responsive rules, themes, and component styles
│   ├── components/
│   │   ├── app.js          # Sample playlist and track-selection orchestration
│   │   ├── player.js       # Range-control presentation behavior
│   │   ├── theme.js        # Theme switching and living-wallpaper lifecycle
│   │   └── track.js        # Playlist track rendering and duration formatting
│   └── assets/
│       ├── theme/          # Static theme artwork
│       └── wallpaper/      # Theme-specific MP4 living wallpapers
├── LICENSE
└── README.md
```

## API direction

The API is versioned under `/api/v1` and currently specifies:

- `GET /playlists`
- `GET /playlists/{playlistId}/tracks`
- `GET /tracks/{trackId}/audio`

The audio endpoint is designed for browser playback and byte-range seeking while keeping file paths private from clients. See [`api-contract.yaml`](./api-contract.yaml) for schemas and error responses.

## Repository status

- Default branch: `main`
- Working tree: clean at the time of documentation
- Current HEAD: `699546a`
- Feature branches: none currently present
- Pull requests: no open pull requests; PR #1, which fixed background artwork covering page content, is merged

## Running the prototype

The web prototype is static and can be served by any local HTTP server. For example:

```bash
cd web
python3 -m http.server 8000
```

Then open <http://localhost:8000/main_menu.html> in a browser.

## Development roadmap

1. Implement the backend described by the API contract.
2. Replace sample playlist data with API requests and real media metadata.
3. Connect the player controls to the audio endpoint and browser media APIs.
4. Add validation, automated tests, and deployment documentation.
