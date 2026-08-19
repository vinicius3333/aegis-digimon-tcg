# Aegis

Aegis is an open-source, server-authoritative engine and web client for playing
the Digimon Card Game online.

The project is written in TypeScript. Card behavior is implemented directly,
one card at a time, in modules that can be reviewed and tested independently.
The server owns all rules and state changes; the browser only renders visible
state and sends player intents.

> Aegis is an unofficial, non-commercial fan project. It is not affiliated
> with, endorsed by, or sponsored by Bandai.

## How it works

The workspace is divided into three packages:

| Package         | Responsibility                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| `@aegis/api`    | Colyseus server, rules engine, matches, tournaments, bots, and card behavior |
| `@aegis/web`    | React, Vite, and PixiJS client                                               |
| `@aegis/shared` | Shared card data, state schemas, types, and network protocol                 |

Clients submit intents such as playing a card or declaring an attack. The API
validates the intent, resolves rules and effects, updates the authoritative game
state, and synchronizes the permitted result to each client.

More detail is available in [Architecture](./docs/ARCHITECTURE.md) and the
[API contract](./docs/API-CONTRACT.md).

Card implementation progress is tracked in the public
[Aegis Digimon TCG Card Roadmap](https://github.com/users/vinicius3333/projects/5).

## Requirements

- Node.js 20 or newer
- pnpm 10, managed through Corepack

## Getting started

```bash
corepack enable
pnpm install
pnpm dev
```

The development command starts the shared package in watch mode, the API on
port `2567`, and the web client at `http://localhost:5173`.

The client connects to `ws://localhost:2567` by default. Set
`VITE_AEGIS_API_URL` to use another API endpoint.

## Common commands

```bash
pnpm dev           # run the complete development workspace
pnpm build         # build shared, API, and web packages
pnpm typecheck     # type-check every package
pnpm test          # run package test suites
pnpm test:tools    # run repository tool tests
pnpm lint          # run Oxlint
pnpm format:check  # check formatting with Oxfmt
pnpm ci            # run the complete verification suite
```

To run a single package, use a pnpm filter:

```bash
pnpm --filter @aegis/api dev
pnpm --filter @aegis/web dev
pnpm --filter @aegis/shared dev
```

## Repository structure

```text
.
├── apps/
│   ├── api/                 # authoritative server and game rules
│   └── web/                 # browser client
├── data/kb/                 # rules, rulings, errata, and ban list data
├── docs/                    # architecture, protocol, release, and operations docs
├── packages/shared/         # shared schemas, types, protocol, and card data
├── tools/                   # validation, import, release, and operational tools
├── docker-compose.yml       # local container stack
└── pnpm-workspace.yaml
```

Package boundaries are intentional: the API and web client may depend on the
shared package, but they do not depend on each other. Game rules belong on the
server and must not be implemented in the client.

## Implementing cards

Each card module lives at:

```text
apps/api/src/cards/<SET>/<CARD-ID>.ts
```

Behavioral tests are colocated with card modules whenever practical. Changes
should assert observable game-state outcomes rather than internal implementation
details. The shared card catalog and knowledge base provide card metadata and
rules context; card-specific behavior remains explicit TypeScript code.

## Contributing

Contributions are welcome. Before submitting a change:

1. Keep rules and state transitions in the API.
2. Add or update tests for observable behavior.
3. Run `pnpm ci`.
4. Keep commits focused and describe user-visible or rules-visible effects.

## Legal notice

The source code in this repository is available under the MIT License. Digimon,
the Digimon Card Game, card artwork, card text, and related trademarks are the
property of their respective owners and are not covered by the project's
software license.

The project is developed as a non-commercial community effort. The MIT License
does not impose that limitation on use of the software. If you enjoy the
project, please support the official Digimon Card Game.

## Credits

Card data comes from the community-maintained
[TakaOtaku/Digimon-Card-App](https://github.com/TakaOtaku/Digimon-Card-App)
database (`src/assets/cardlists/DigimonCards.json`, MIT License, © Christian
Bayer). `tools/import-taka-cards.mjs` maps those records into this project's
`CardDefinition` shape. Thanks to its maintainers and contributors.

## License

[MIT](./LICENSE) © Vinícius Luiz.
