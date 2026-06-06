# Alone Among the Stars

A mobile web app of Takuma Okada's solo journaling RPG *Alone Among the Stars*:
roll a die, get dealt cards, write a short journal entry for each point of
interest on a planet, then name and keep the planet — or burn it. Calm, minimal,
meditative.

> Original game by **Takuma Okada** — [noroadhome.itch.io](https://noroadhome.itch.io).
> This is a fan-made tribute / digital companion; the in-app About screen keeps
> the original game text and credit verbatim.

## What it is

- **Single file, zero build.** The whole app is in `index.html` — React via CDN,
  no bundler, no install step. Open it and it runs.
- **On-device only.** Published planets are saved to your browser's
  `localStorage`. Nothing is sent anywhere — no accounts, no cloud. An
  in-progress journey is ephemeral (reloading discards it); burning is permanent.
- **Installable PWA.** A web manifest + service worker make it installable to a
  phone home screen and fully usable offline after the first visit.

## Run it locally

Any static server works:

```sh
python3 -m http.server 4599
# then open http://localhost:4599
```

## Live site (GitHub Pages)

This repo is ready to publish as-is. In the repo:
**Settings → Pages → Build and deployment → Source: Deploy from a branch →
`main` / `(root)` → Save.** It goes live at
`https://<user>.github.io/<repo>/` in a minute or so. All paths are relative, so
it works from a project subpath or a custom domain.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The entire app. |
| `manifest.webmanifest`, `sw.js` | PWA shell (installable + offline). |
| `icons/icon.png` | The one app icon (crescent moon) — used for the PWA, the iOS home screen, and the browser tab. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

## Notes

- First load pulls a few hundred KB from CDN (React + in-browser Babel) and
  compiles on the fly; the service worker caches everything, so later loads are
  fast and work offline.
- `localStorage` is per-origin, so journals saved on `localhost` won't appear on
  the published URL, and vice-versa — that's expected.
- To ship an update, edit `index.html` and bump `VERSION` in `sw.js` so visitors
  pick up the new version instead of the cached one.
