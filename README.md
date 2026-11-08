<!--
SPDX-FileCopyrightText: 2026 l5yth
SPDX-License-Identifier: CC0-1.0
-->

# 40c3-cdc

Design assets of the Critical Decentralisation Cluster at 40C3.

Page: <https://l5yth.github.io/40c3-cdc/>

## Embed on a website

```html
<img src="https://l5yth.github.io/40c3-cdc/embed/typewriter-5.svg" alt="40C3 Critical Decentralisation">
```

The page has one line like this per file.

## Show on a projector

```
chromium --kiosk "https://l5yth.github.io/40c3-cdc/play/?a=banner&c=5"
```

| Parameter | Values |
| --- | --- |
| `a` | `banner`, `typewriter`, `blink`, `conveyor` |
| `c` | `5`, `A`, `B`. For `conveyor` also `0` |

## Use offline

Download a file from `embed/`. It needs no network.

For the player, open `_site/play/index.html` after a build.

## Add a file

1. Put the file in `assets/<folder>/` or `designs/<folder>/`.
2. Run `npm run build`.
3. Commit.

The folder becomes a section on the page.

## Build

Needs Node.js 22 or later and `rsvg-convert`.

```
npm ci
npm run build
```

Output: `embed/` and `_site/`.

## Test

```
npm run lint
npm run typecheck
npm run docs:check
npm test
npm run check:embed
reuse lint
npm run test:e2e
```

`npm run test:e2e` needs a build and Chromium. Set `CHROME` to use another browser binary.

## Deploy

1. In the repository settings, set Pages, Source to GitHub Actions.
2. Push to `main`.

## Folders

| Path | Content |
| --- | --- |
| `assets/` | CDC logos, patterns and Matrix icons. Do not edit. |
| `designs/` | Final designs |
| `embed/` | Generated animations and stills |
| `upstream/` | Official 40C3 package |
| `src/`, `test/` | Generator, page, player, tests |

## License

CC0-1.0. `upstream/40c3-styleguide/fonts/` holds fonts under their own licenses. See `REUSE.toml`.
