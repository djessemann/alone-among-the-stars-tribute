# Project instructions

## Always ship changes end-to-end

Whenever I ask for a change, take it all the way to **visible on the live URL** —
don't stop at "committed to a branch." For every change, unless I explicitly say
otherwise:

1. **Push** the work (develop on the requested feature branch).
2. **Get it onto `main`** — open a PR and merge it (squash). `main` is what
   GitHub Pages deploys, so nothing is live until it's on `main`.
3. **Refresh / deploy** — the merge triggers the "pages build and deployment"
   workflow automatically.
4. **Confirm it's live** — verify the Pages deploy ran to `success` for the merge
   commit before telling me it's done. Report the status plainly.

The live site: https://djessemann.github.io/alone-among-the-stars-tribute/

## Service worker cache — bump it on every shipped change

The app is a PWA with a service worker (`sw.js`) that serves the cached app shell
first. If you change `index.html`, `planet-renderer.js`, or any other shell asset
but leave `sw.js` untouched, clients keep seeing the **old** version even after the
deploy succeeds — a hard refresh often won't fix it on mobile/installed PWAs.

So: any time a shell asset changes, **bump `VERSION` in `sw.js`** (e.g.
`aats-v12` → `aats-v13`) in the same change. That forces the worker to re-install,
precache the fresh shell, and purge the old cache. This is required for me to
actually see the change on the URL.
