# Running Quantum Runner offline

Quantum Runner is a pure client-side application. The quantum circuit is
simulated in the browser by [`@qamposer/react`](https://www.npmjs.com/package/@qamposer/react),
so the built bundle makes **no network requests at runtime** — no API server, no
CDN, no web fonts. Once the files are on the device, the game works fully offline.

## Getting the bundle

Download `quantum-runner-<version>.tar.gz` from the
[Releases page](https://github.com/QAMP-62/qamposer-usecases/releases) and verify it:

```bash
sha256sum -c SHA256SUMS
tar -xzf quantum-runner-<version>.tar.gz
```

Or build it yourself (requires Node.js 22+ and pnpm 11; needs network access
once, for dependencies):

```bash
cd quantum-runner
pnpm install --frozen-lockfile
pnpm build          # output in dist/
```

## Serving it

Point any static web server at the extracted directory:

```bash
python3 -m http.server 8000 --directory quantum-runner-<version>
# then open http://localhost:8000/
```

nginx, lighttpd, `busybox httpd` or any other static server works just as well —
there is nothing to configure beyond a document root.

Two things worth knowing:

- **Serve over HTTP, not `file://`.** The bundle is loaded as an ES module, and
  browsers block module scripts on `file://` URLs. Opening `index.html` directly
  from disk shows a blank page.
- **Any URL path works.** The bundle is built with Vite's `base: './'`, so all
  asset references are relative. Serving it from a sub-path such as
  `http://localhost/fun-with-quantum/quantum-runner/` needs no rebuild.

## What is in the bundle

```
quantum-runner-<version>/
├── index.html
├── assets/          # hashed JS and CSS
├── vite.svg
├── LICENSE          # Apache-2.0
├── NOTICE
└── OFFLINE.md       # this file
```
