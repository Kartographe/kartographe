// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Unquoted SQL identifiers — a schema, a table, a column.
 *
 * The strict, portable subset: a letter or an underscore, then letters, digits
 * and underscores. Both MySQL and PostgreSQL accept more once the identifier is
 * quoted, but anything outside this set has to be quoted *everywhere* it is
 * used afterwards, which is a trap we do not hand the user.
 */
export const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** PostgreSQL truncates past 63 bytes; MySQL rejects past 64. Take the floor. */
export const IDENTIFIER_MAX_LENGTH = 63;

/** Every character an identifier may contain, valid position or not. */
const IDENTIFIER_CHARS = /[^A-Za-z0-9_]/g;

export function isIdentifier(value: string): boolean {
  return (
    value.length <= IDENTIFIER_MAX_LENGTH && IDENTIFIER_PATTERN.test(value)
  );
}

/**
 * Drops the characters an identifier can never contain, so typing a space or a
 * dash simply does nothing. Position is not enforced here: a leading digit is
 * left alone as the user types, and caught on submit — deleting it out from
 * under them mid-word would be worse.
 */
export function stripNonIdentifier(value: string): string {
  return value.replace(IDENTIFIER_CHARS, "").slice(0, IDENTIFIER_MAX_LENGTH);
}
