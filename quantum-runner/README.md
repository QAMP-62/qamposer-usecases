# Quantum Runner

A quantum circuit puzzle game built with [@qamposer/react](https://github.com/QAMP-62/qamposer-react). Quantum mechanics and simulation results are directly leveraged as game logic.

![Quantum Runner](../docs/gif/gaming.gif)

## Prerequisites

- Node.js 22+ (pnpm 11 requires it)

## Quick Start

```bash
pnpm install
pnpm dev
```

## Offline / self-hosted builds

The game is fully client-side and makes no network requests at runtime, so a
production build can be served from any static web server without an internet
connection — for example on a Raspberry Pi at a workshop venue.

Pre-built bundles are attached to every
[release](https://github.com/QAMP-62/qamposer-usecases/releases) as
`quantum-runner-<version>.tar.gz`, together with a `SHA256SUMS` file. To build
one locally instead, run `pnpm build` and serve the resulting `dist/`.

See [OFFLINE.md](./OFFLINE.md) for serving instructions and caveats.

## Tech Stack

- React 19
- @qamposer/react (QamposerMicro)
- Vite
