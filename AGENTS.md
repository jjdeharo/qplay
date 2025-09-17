# Repository Guidelines

## Project Structure & Module Organization
- `index.html` hosts the presenter dashboard, wiring `index.js`, `index.css`, and CDN-delivered libraries.
- `jugador.html`, `editor.html`, and `editor_ia.html` cover player access and quiz creation; keep shared styling tweaks in `index.css`.
- Game flow lives in `index.js`, while localization flows through `i18n.js` plus the `locales/*.json` bundles.
- Assets include `musica/` background loops and the `ejemplo.csv` sample quiz; leave filenames and headers intact.

## Build, Test, and Development Commands
- Serve the repository with `python3 -m http.server 4173` and open `index.html` to avoid fetch/CORS errors.
- For quick checks you can open the HTML files directly, but always rerun via the local server before pushing.
- Load `ejemplo.csv` from the presenter after CSV or parser edits to confirm the schema.
- Exercise PeerJS flows by opening a second browser profile on `jugador.html` to emulate players.

## Coding Style & Naming Conventions
- Use 4-space indentation, explicit semicolons, `const`/`let`, and assume strict-mode semantics.
- Stick to descriptive camelCase in Spanish (`guardarEstadoJuego`) and reserve uppercase constants for shared config.
- Cluster DOM lookups and event handlers toward the top of the script; reuse helpers instead of inline callbacks.
- Locale keys remain lowercase snake_case mirrored across files; document new keys inside pull requests.

## Testing Guidelines
- Manual testing is required: host the presenter, join from `jugador.html`, and play through scoring and podium screens.
- Refresh the player mid-round to confirm reconnection messaging and duplicate-name handling.
- Toggle languages after UI changes to verify `data-i18n-key` coverage and placeholder replacements.
- Let timers elapse with audio enabled to catch regressions tied to `musica/` assets.

## Commit & Pull Request Guidelines
- Follow short imperative commit subjects (`Update en.json`, `Adjust timer copy`) under 60 characters.
- Mention touched areas in the body when multiple domains change (e.g., presenter UI plus locales).
- Pull requests should include a purpose summary, manual test matrix (browser/device), and screenshots or GIFs for UI tweaks.
- Link issues and flag follow-up tasks so maintainers can release safely.

## Localization & Assets
- Update every locale together; keep placeholder tokens such as `{current}` intact and documented.
- Name new audio sequentially (`09.mp3`) and describe trigger logic in the pull request.
- If the CSV schema changes, revise `ejemplo.csv` and the AI prompt text so contributors stay aligned.
