<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject
SPDX-License-Identifier: AGPL-3.0-only
-->

# Licensing

Kartographe is **open core**. Two licenses coexist in this repository, and
which one applies to a file depends only on where that file lives.

| Location | License | SPDX identifier | Source-available | OSI-approved |
| --- | --- | --- | --- | --- |
| Everything except `ee/` | GNU Affero GPL v3.0 only | `AGPL-3.0-only` | yes | yes |
| `apps/back/ee`, `apps/front/src/ee` | Elastic License 2.0 | `Elastic-2.0` | yes | **no** |

**Every source file carries an SPDX header, and that header is authoritative.**
If you are unsure about a file, read its first two lines. Files that cannot
carry a header (generated code, assets, lockfiles) are declared in
[`REUSE.toml`](./REUSE.toml). The repository follows the
[REUSE](https://reuse.software) specification, and `reuse lint` runs in CI.

The [`LICENSE`](./LICENSE) file at the root is the verbatim, unmodified AGPL-3.0
text — the FSF asks that its text not be altered, so the scope of the split is
described here rather than inside it. The copyright holder is identified in
[`NOTICE`](./NOTICE).

## What this means for you

**You self-host Kartographe for your own use.** The AGPL core is free, forever,
and fully functional on its own. There is no crippled community edition: the
core is the product. You need nothing from us.

**You self-host and you modify it.** Fine — that is the point of the AGPL. But
section 13 applies: if your users reach your modified version over a network,
you must offer them your modified source. Publishing our repository URL does
not discharge that for you.

**You want the commercial features** (`ee/`) — larger quotas, enterprise
authentication, and what follows. Those need a license key. Write to
**license@kartographe.eu**.

**You want to resell Kartographe as a managed service.** The AGPL permits this
for the core. The Elastic License 2.0 does not permit it for `ee/`. Talk to us.

## Why the split is drawn this way

Combining AGPL code and proprietary code in one program is only lawful for the
party that holds copyright on both — a copyright holder cannot infringe its own
license. ChallengeMyProject holds copyright on all of Kartographe, which is why
this arrangement works, and why [`CONTRIBUTING.md`](./CONTRIBUTING.md) requires
a CLA. Without consolidated copyright, the split would not survive contact with
a lawyer.

## The rule for what goes in `ee/`

> **A paid feature's code lives in `ee/`. A flag in the AGPL core is not
> enforceable.**

The AGPL grants everyone the right to modify the core. Anyone may lawfully
patch the core's entitlement resolution and grant themselves every flag. That
right cannot be revoked by code sitting in the core.

The Elastic License 2.0, by contrast, forbids moving, changing, disabling or
circumventing the license key functionality, and forbids removing or obscuring
functionality protected by that key. So what protects a feature is **the
location of its code**, not the guard in front of it. A guard such as
`require_feature(...)` in the core is a routing decision; the boundary is that
the unlocked code is not in the core at all.

We would rather write this down than have you discover it by reading the
source.

### Quotas are the honest exception

Entity quotas restrict *core* entities — applications, databases, journeys —
which are AGPL. So quota enforcement is:

- **technical** in Kartographe Cloud, where we control the runtime;
- **contractual** on-premise, through the subscription agreement.

On-premise quotas are not enforced by the code, and we do not claim they are.

## Boundary rules

1. The backend core never imports from `ee/`. The dependency points one way.
   The core reaches `ee/` only through the entitlements provider registry, via
   a guarded import.
2. **The backend core must build, boot and pass its tests with `ee/`
   deleted.** CI enforces it. That job, not this document, is what proves the
   split is real.
3. Every file under `ee/` carries an `Elastic-2.0` header; everything else
   carries `AGPL-3.0-only`. `reuse lint` enforces it.

Rules 1 and 2 are scoped to the backend deliberately. That is where
entitlements are resolved and enforced, so that is where the boundary has to
hold. The frontend is not an enforcement surface — it only renders what the API
has already authorised — so `apps/front/src/ee` is a licensing boundary, marked
by headers, rather than a build-level one. We would rather say that plainly
than imply a guarantee the CI does not check.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Contributions require signing a CLA
so that ChallengeMyProject can keep offering Kartographe under both licenses.
We are aware that this asks something real of you, and the reasoning is set out
there rather than hidden.
