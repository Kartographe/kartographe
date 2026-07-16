# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Reusable column mixins.

Several tables capture the network origin of an event (who registered, who
activated, who last authenticated). Rather than repeat three columns per event
on every model, each moment gets a small mixin adding `<prefix>_ip`,
`<prefix>_city`, `<prefix>_country`.

> Kept intentionally light: the IP is stored as a plain string and the
> city/country columns are left nullable for a later geo-lookup service. No
> PostGIS geometry column (the bundled Postgres image ships without the
> extension) — add one behind a `Searchable`-style mixin if precise geo is
> ever needed.

These are non-table SQLModel mixins: concrete tables inherit them alongside
`BaseModel` and add `table=True`.
"""

from sqlmodel import Field, SQLModel


class CreatedIpFields(SQLModel):
    created_ip: str | None = Field(default=None, index=True)
    created_city: str | None = Field(default=None)
    created_country: str | None = Field(default=None)


class ActivationIpFields(SQLModel):
    activation_ip: str | None = Field(default=None, index=True)
    activation_city: str | None = Field(default=None)
    activation_country: str | None = Field(default=None)


class LastAuthenticationIpFields(SQLModel):
    last_authentication_ip: str | None = Field(default=None, index=True)
    last_authentication_city: str | None = Field(default=None)
    last_authentication_country: str | None = Field(default=None)


class AuthenticationIpFields(SQLModel):
    authentication_ip: str | None = Field(default=None, index=True)
    authentication_city: str | None = Field(default=None)
    authentication_country: str | None = Field(default=None)
