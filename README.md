# TaoHolder

taoholder.com. Single-file site: `index.html`. No build step. Fonts from Google Fonts, price data from CoinGecko (public endpoint, no key).

## Deploy

Push to `main`, then Settings > Pages > Deploy from branch > `main` / root. Add `taoholder.com` as the custom domain and point DNS at GitHub Pages.

## Page structure

| Section | Content | Animation |
|---|---|---|
| Hero | Positioning statement, two CTAs, live TAO strip | Neural tree: 16s loop, golden pulse, labels morph SUBNETS / LEARN / BUILD / PARTICIPATE into INTELLIGENCE MARKETS / DISCOVER / COMPOSE / GOVERN, canopy expands into a web |
| Network | Miners, validators, emissions, stakers | Brain-shaped cortex of nodes with signals propagating along edges |
| Subnet index | SN, category, operator, coverage | |
| Research | Four-part series | |
| Tools | TaoProof, subnet index data | |
| Participate | Acquire, stake, allocate | |

Both canvases pause when off-screen and render a single still frame under `prefers-reduced-motion`.

## Live strip

Pulls price, 24h change, market cap, and volume for TAO from CoinGecko on load. If the request fails or is rate-limited, the strip stays hidden. Swap the endpoint for Taostats if you want subnet counts or emissions.

## Fill in

1. `Episode 01` to `03` links in the subnet index point at `#`.
2. TaoProof has no link yet.
3. Add an `og:image` (1200x630) once you have a still you like; the meta tag slot is in `<head>`.
