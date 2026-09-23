# Branchify

Branchify is a lightweight static React + TypeScript utility for generating clean, consistent Git branch names in seconds.

It ships as a self-contained Docker image, so you can run it wherever you like —
a spare port on your laptop, a VPS, or a homelab box behind your own reverse
proxy. There's no backend, database, or external service: it's a single static
site served by Nginx. I run my own instance from a self-hosted server at home,
and you're free to spin up your own the same way (see
[Docker (Static Hosting)](#docker-static-hosting) below).

<img width="499" height="361" alt="image" src="https://github.com/user-attachments/assets/460553d6-db0d-4e29-ab59-4c06fa1ae305" />

## Features

- Fast branch name generation with simple inputs
- Supports optional ticket numbers while keeping the final branch visible
- Generates PR titles like `feat/BRF-123: Description.`
- Copies the generated branch name and full `git checkout -b` command
- Persists your latest values and recent branches in `localStorage`
- Fully static frontend output (`dist/`) with no backend runtime
- Mobile-friendly, minimal UI
- A living koi pond behind the form, with a daily koi market you stock by making branches

## Branch Naming Formula

Branchify uses a simple, consistent branch naming pattern:

### With Ticket Number

```
<type>/<ticket-number>/<details>
```

**Example:** `feat/BRF-123/add-user-authentication`

### Without Ticket Number

```
<type>/<details>
```

**Example:** `feat/add-user-authentication`

### Components

- **Type** — The kind of work (e.g., `feat`, `fix`, `bugfix`, `chore`, `refactor`, `release`, `style`, `test`, `experiment`)
- **Ticket Number** — Optional project ticket/issue ID (e.g., `BRF-123`, `PROJ-456`)
- **Details** — A brief, lowercase kebab-case description of the work

## Output Format

Once you generate a branch name, Branchify provides three outputs:

### Branch Name

The formatted Git branch name ready to use, e.g.:

```
feat/add-user-authentication
```

### Git Command

A complete, ready-to-paste command to create and checkout the branch:

```
git checkout -b "feat/add-user-authentication"
```

### PR Title

A properly formatted pull request title following conventional commits. With a
ticket it becomes `feat/BRF-123: Add user authentication.`; without one it falls
back to `feat: Add user authentication.`

All three outputs are one-click copyable for quick pasting into your terminal or PR form.

## Koi Pond & Market

The default background is a 3D koi pond (three.js, with a 2D fallback when WebGL
isn't available). Out of the box, each recent branch swims as its own koi, and
a few resident koi keep the pond occupied. You set how many residents there are
under **Settings → Fish always in the pond**.

### Say hello

The pond has stones on its bed and water lilies on its surface, and the koi
swim over one and under the other.

- **Click the water** and a ring spreads from your fingertip. The koi notice,
  each in its own time (the bold ones first, the shyest not at all), and cruise
  over to investigate. When they arrive they rise to the surface and gulp at it,
  milling about for a while before sinking back to their own depth.
- **Right-click the water** to scatter a handful of pellets. They float and
  drift for about thirty seconds before sinking. Hungry koi come for the nearest
  one, rise, and take it with a splash. Chagoi are first to the food, as they
  are in real ponds.

Clicks on the panel or any dialog are left alone, and the context menu is only
replaced over open water. With reduced motion on, the pond stays still.

### Real varieties

The market sells real nishikigoi varieties, from plain self-coloured fish to
patterned ones. Each variety is written as a recipe that says where its colour
sits:

- **Self-coloured:** Benigoi (red), Orenji Ogon (metallic orange), Yamabuki
  Ogon (gold), Platinum Ogon, Kigoi, Chagoi, Soragoi, Karasugoi, Aka Matsuba
- **Patterned:** Kohaku, Tancho, Taisho Sanke, Showa, Shiro Bekko, the three
  Utsuri, Asagi, Goshiki, Ochiba Shigure
- **Metallic and scaleless:** Kujaku, Hariwake, Shusui, Kumonryu, Beni
  Kumonryu, Kin Kikokuryu, and the rare Midorigoi

A fish can also be born with a trait: **Gin Rin** (sparkling scales),
**Doitsu** (scaleless) or **Butterfly** (long, flowing fins). Traits raise its
rarity and its price. A fish's genome is just its variety, traits and seed, so
the fish in a listing's photo is exactly the fish that swims in your pond.

### The market

With the koi pond selected, a koi button appears in the header next to the
GitHub icon:

- **Daily stock.** The market lists six koi a day, seeded by the date, so
  everyone starts the day with the same fish. It restocks at local midnight.
  Every tank includes at least one self-coloured koi and one patterned one.
- **Buy one, another arrives.** A bought koi is replaced where it swam, so the
  tank always holds six. Can't wait for midnight? **Restock** swaps all six for
  a fresh tank for 100 coins.
- **Coins come from branching.** The first time a new branch name is copied
  or saved to your recent list, it earns 25 coins, up to 8 branches a day. New
  visitors start with 100 coins, plus 25 for each branch already in their
  recent list.
- **Koi for sale by age.** Like a dealer's, the tank is mostly tosai (koi in
  their first year) and nisai, with the odd sansai or older fish, and every tank
  has at least one tosai. Price follows size: half the length is a quarter of
  the price.
- **Fish grow.** A day for you is a week in the pond. Koi and goldfish follow a
  real growth curve (von Bertalanffy), fast when young and levelling off at an
  adult size set by their genes. A young koi grows about a centimetre every two
  or three days, and most top out in the seventies, with the odd 80 cm+ jumbo.
  Value grows with the square of length, and the market's **Your pond** tab
  shows the pond's total value, what it has gained, and how fast it is growing.
- **Your pond.** Once you own a market koi, market koi fill the whole pond and
  the branch koi and residents rest. The pond holds up to 10 koi. Releasing a
  fish pays back half of what it is worth now, and it's gone for good: it never
  returns to the market. Release them all and the branch koi return.
- **Goldfish.** A Goldfish tab sells real pond breeds (Common, Comet, Sarasa
  Comet, Shubunkin, Bristol Shubunkin, Wakin, Tamasaba and Fantail), always in
  stock and cheap. They swim alongside whichever koi are in the pond, up to 6,
  drawn to scale beside them and without barbels. Fancy breeds too delicate to
  share a pond with koi aren't sold.
- **How it works, and the koi guide.** A panel at the top of the market
  explains the rules. The book icon opens a short guide to koi: where they come
  from, how their names work, every variety grouped by show family, the traits,
  and where the market takes liberties.
- **Portraits.** The fish are photographed with the same renderer as the pond,
  and the koi under your pointer comes to life and swims in place.

There is no payment gateway and no server. Coins and koi live in `localStorage`
under `branchify-koi-market`.

## Tech Stack

- [Vite](https://vite.dev/) (build + dev server)
- React + TypeScript
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- ESLint + Prettier for linting and formatting
- Nginx for static Docker hosting

## Project Structure

```
src/
  app.tsx                     # Orchestrates state and composes the UI
  main.tsx                    # React entry point
  types.ts                    # Shared domain types
  components/
    branch-form.tsx           # Input form (type, ticket, description)
    branch-outputs.tsx        # Generated branch, git command, PR title
    recent-branches.tsx       # Recently generated branches list
    copy-button.tsx           # Copy-to-clipboard button with feedback
    particles-background.tsx  # Animated background
    koi3d-background.tsx      # The 3D koi pond (falls back to koi-background.tsx)
    koi-market.tsx            # The market dialog: today's koi and your pond
    koi-market-button.tsx     # Header button, new-stock dot and coin pop
    koi-guide.tsx             # The koi guide: history, names, varieties, traits
  hooks/
    use-recent-branches.ts    # Recent-branch state + persistence
    use-koi-account.ts        # Coins, owned koi, and the market day
  lib/
    branch-utils.ts           # Pure branch/PR-title formatting logic
    storage.ts                # Safe localStorage helpers + parsing
    koi-varieties.ts          # The nishikigoi catalogue, as pattern recipes
    koi-genome.ts             # Variety + traits + seed → a koi's exact look
    koi-market.ts             # The daily stock, names and prices
    koi-account.ts            # Earning, buying and releasing, as pure functions
    fish-growth.ts            # How fish grow, and what growing makes them worth
    goldfish.ts               # The pond goldfish breeds, as recipes
    goldfish-market.ts        # The always-in-stock goldfish counter
    koi-portrait.ts           # Photographs koi for the market's cards
    koi3d.ts                  # The pond stage: arrivals, departures, the panel
    koi-attention.ts          # How koi notice a touch on the water, and food
    pond-decor.ts             # Stones on the bed, lilies on the surface
    pond-surface.ts           # Ripples and floating pellets
  vendor/koi-pond/            # The hyperfrontend koi, untouched (see its README)
```

Presentation lives in `components/`, reusable stateful behaviour in `hooks/`,
and all pure logic in `lib/` so it can be unit-tested in isolation. Every module
stays well under 250 lines.

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Testing & Quality

```bash
npm test            # run the unit and component test suite once
npm run test:watch  # watch mode for local development
npm run coverage    # run tests with a coverage report
npm run lint        # ESLint
npm run format      # apply Prettier formatting
```

The pure logic in `src/lib/` is covered by fast unit tests, and the React
components are exercised with Testing Library. CI runs lint, formatting, tests,
and a production build before any Docker image is built.

## Production Build

```bash
npm run build
```

The static site is written to `dist/`.

## Docker (Static Hosting)

### Build image

```bash
docker build -t branchify:latest .
```

### Run container

```bash
docker run --rm -p 8080:80 branchify:latest
```

App will be available at `http://localhost:8080`.

## Docker Compose (Homelab Friendly)

```bash
docker compose up -d --build
```

This starts one service:

- `branchify` (serves the static app on internal container port `80`)

The included Nginx config supports SPA route refresh via `try_files ... /index.html`.

## GitHub Actions to Docker Hub

The workflow at `.github/workflows/docker-publish.yml` will:

- build the Docker image for pull requests targeting `main`
- build and push the image to Docker Hub on pushes to `main`
- publish `latest` for the default branch and `sha-*` tags for traceability

Add these repository secrets in GitHub before enabling the publish step:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional repository variable:

- `DOCKERHUB_REPOSITORY` to publish to an explicit image path such as `blades/branchify`

The published image name defaults to:

```text
<DOCKERHUB_USERNAME>/branchify
```

If `DOCKERHUB_REPOSITORY` is set, it overrides the default and publishes to that exact Docker Hub repository.

Pull request builds do not push to Docker Hub. They build against a local fallback image name so the workflow still validates successfully when secrets are unavailable.

## Notes

- This is now a **fully static app**: no backend, no runtime Node server.
- The Docker image uses multi-stage builds: Node for compile, Nginx for serving.
- Intended to sit cleanly behind an existing reverse proxy in a homelab setup.
