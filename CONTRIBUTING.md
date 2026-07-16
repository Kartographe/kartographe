<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject
SPDX-License-Identifier: AGPL-3.0-only
-->

# Contributing to Kartographe

Thanks for wanting to help. Two things are specific to this project and worth
reading before you open a pull request: the CLA, and the licensing boundary.

## The CLA

Kartographe asks every contributor to sign a Contributor License Agreement
before their first pull request is merged: [`CLA.md`](./CLA.md).

**Why.** Kartographe is open core: the bulk is AGPL-3.0, the `ee/` directories
are Elastic License 2.0, and both are combined into one running program.
Combining copyleft and proprietary code in a single program is only lawful for
the party holding copyright on both parts — a copyright holder cannot infringe
its own license. If contributions arrived under the AGPL alone, the core would
become jointly owned, and the AGPL would then require the combined work to be
entirely AGPL. The dual-license model would break.

So the CLA is not paperwork for its own sake. It is the thing that makes the
model lawful, and it has to be signed before the contribution lands, not after.

**What it does and does not do.** You keep the copyright on your contribution.
You grant ChallengeMyProject a broad license, including the right to distribute
your work under licenses other than the AGPL — that last part is what a normal
open source CLA does not include, and we would rather say so plainly than bury
it. Read [`CLA.md`](./CLA.md); if it is not acceptable to you, that is a
legitimate position, and opening an issue is still welcome and useful.

**How.** Sign via CLA Assistant, which comments on your first pull request.

## Which license am I writing under?

Read the SPDX header at the top of the file you are editing. It is
authoritative.

- `AGPL-3.0-only` — everything except `ee/`.
- `Elastic-2.0` — `apps/back/ee`, `apps/front/src/ee`.

**External contributions to `ee/` are not accepted.** Those directories are the
commercial edition; keeping them free of outside copyright keeps the licensing
clean. Contributions to the AGPL core are welcome, and the core is where nearly
everything lives.

Two boundary rules the CI enforces, so you may as well know them up front:

1. **The core never imports from `ee/`.** The dependency points one way.
2. **The core builds, boots and passes its tests with `ee/` deleted.** If your
   change breaks the `core-without-ee` job, the split is broken.

See [`LICENSING.md`](./LICENSING.md) for the full rationale.

## New files need a header

Every source file carries an SPDX header:

```python
# SPDX-FileCopyrightText: 2026 ChallengeMyProject
# SPDX-License-Identifier: AGPL-3.0-only
```

Generated files, assets and lockfiles are declared in [`REUSE.toml`](./REUSE.toml)
instead. `reuse lint` runs in CI and will tell you what it wants. To check
locally:

```bash
pipx run reuse lint
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org), scoped by app:
`feat(back): …`, `fix(front): …`, `chore(docker): …`. Backend commits also
carry a `Changelog:` trailer. Keep unrelated changes in separate commits.

## Running the stack

Everything is driven by the root `.env` (copy it from `.env.example`):

```bash
cp .env.example .env
docker compose up --build   # Postgres + API + front SPA
```

The API lands on `:8000` (Scalar reference at `/docs`), the SPA on `:5173`.
Per-app setup, including running one app on the host against the dockerised
database, is in [`apps/back/README.md`](./apps/back/README.md) and
[`apps/front/README.md`](./apps/front/README.md).
