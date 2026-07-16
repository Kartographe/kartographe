<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject
SPDX-License-Identifier: Elastic-2.0
-->

# `apps/back/ee` — Enterprise Edition (backend)

**Everything in this directory is licensed under the Elastic License 2.0**
([`LICENSE`](./LICENSE)), **not** the AGPL-3.0 that covers the rest of
Kartographe. See [`LICENSING.md`](../../../LICENSING.md) at the repository root
for the full picture.

## Why this directory exists

Kartographe is open core. The core (`apps/back/src`) is AGPL-3.0 and always
fully functional on its own. Commercial features live here, behind a license
key.

## The rule that decides what goes here

> **A paid feature's code must live in `ee/`. A flag in the AGPL core is not
> enforceable.**

This is not a stylistic preference, it is the whole point of the split:

- The AGPL grants everyone the right to modify the core. Someone can legally
  patch the core's entitlement resolution and grant themselves anything. That
  is a right the AGPL gives them, and no amount of code in the core can take it
  back.
- The Elastic License 2.0 explicitly forbids moving, changing, disabling or
  circumventing the license key functionality, and forbids removing or
  obscuring functionality protected by that key. So a feature is protected by
  the *location of its code*, not by the guard in front of it.

Practical consequence: `require_feature(...)` in the core is a **routing
decision**, not a security boundary. The security boundary is that the code
being unlocked is not in the core at all.

## What this means for quotas

Entity quotas restrict core (AGPL) entities — applications, databases,
journeys. Their enforcement is therefore:

- **technically enforced** in Kartographe Cloud, where we control the runtime;
- **contractually enforced** on-premise, by the subscription agreement.

Do not pretend the code enforces on-premise quotas. It does not, and it cannot.

## Boundary rules

1. **The core must never import from `ee`.** The dependency points one way:
   `ee` → `src`, never the reverse. The core reaches `ee` only through the
   entitlements provider registry, via a guarded import in `app_factory`
   (same pattern already used for `fastapi-mcp`).
2. **The core must build, boot and pass its tests with this directory
   deleted.** CI enforces this — see the `core-without-ee` job. If that job
   fails, the split is broken, whatever the file headers say.
3. **Every file here carries an `Elastic-2.0` SPDX header.** `reuse lint`
   enforces it.
