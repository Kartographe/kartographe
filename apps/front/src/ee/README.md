<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject
SPDX-License-Identifier: Elastic-2.0
-->

# `apps/front/src/ee` — Enterprise Edition (frontend)

**Everything in this directory is licensed under the Elastic License 2.0**
([`LICENSE`](./LICENSE)), **not** the AGPL-3.0 that covers the rest of the SPA.
See [`LICENSING.md`](../../../../LICENSING.md) at the repository root.

It lives under `src/` rather than beside it so that the existing `@/*` path
alias and the Vite build keep working with no extra configuration. The nesting
is a build convenience and changes nothing legally: the boundary is drawn by
this `LICENSE`, the per-file SPDX headers, and `REUSE.toml`.

## What belongs here

License-gated UI: the license import screen, entitlement-driven upsell
surfaces, and any screen whose backend counterpart lives in `apps/back/ee`.

## What does not

Plain feature gating — hiding a nav entry when an entitlement is missing — is
ordinary core UI and stays in `features/`. The frontend is not a security
boundary in any case: it only renders what the API already authorises.

See [`apps/back/ee/README.md`](../../../back/ee/README.md) for the rule that
decides what is a paid feature, and why it is the *location* of the code rather
than the guard in front of it that makes a feature enforceable.
