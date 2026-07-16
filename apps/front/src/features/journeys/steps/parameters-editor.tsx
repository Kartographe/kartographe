// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Form, Input, Typography } from "antd";

/** How a schema hint spells the value it wants. Anything else is edited as text. */
const INTEGER = "int";
const DICTIONARY = "dict";

export type RawParameters = Record<string, string>;

/**
 * The raw text of each parameter, seeded from what the step already carries.
 *
 * Parameters are edited as text because the schema is a shape *hint*
 * (`{"time_ms": "int"}`), not a JSON-Schema document — there is nothing richer
 * to bind a typed widget to.
 */
export function toRawParameters(
  schema: Record<string, unknown>,
  parameters: Record<string, unknown> | undefined
): RawParameters {
  const raw: RawParameters = {};
  for (const key of Object.keys(schema)) {
    const value = parameters?.[key];
    if (value === undefined || value === null) {
      raw[key] = "";
    } else if (typeof value === "object") {
      raw[key] = JSON.stringify(value, null, 2);
    } else {
      raw[key] = String(value);
    }
  }
  return raw;
}

export interface ParseResult {
  values: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * Turns the edited text back into the parameters the API expects.
 *
 * The API requires the key set to match the schema *exactly* — no unknown, no
 * missing — so every key is always sent, even empty. It does not check the
 * value types, but sending `"3"` where the action means `3` would quietly store
 * a string, so integers and dictionaries are converted here.
 */
export function parseParameters(
  schema: Record<string, unknown>,
  raw: RawParameters,
  messages: { integer: string; dictionary: string }
): ParseResult {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [key, hint] of Object.entries(schema)) {
    const text = (raw[key] ?? "").trim();
    if (hint === INTEGER) {
      if (text === "") {
        values[key] = null;
        continue;
      }
      const parsed = Number(text);
      if (Number.isInteger(parsed)) {
        values[key] = parsed;
      } else {
        errors[key] = messages.integer;
      }
      continue;
    }
    if (hint === DICTIONARY) {
      if (text === "") {
        values[key] = {};
        continue;
      }
      try {
        values[key] = JSON.parse(text);
      } catch {
        errors[key] = messages.dictionary;
      }
      continue;
    }
    values[key] = text;
  }

  return { values, errors };
}

export function ParametersEditor({
  schema,
  value,
  errors,
  onChange,
}: {
  schema: Record<string, unknown>;
  value: RawParameters;
  errors: Record<string, string>;
  onChange: (next: RawParameters) => void;
}) {
  const { t } = useLingui();
  const keys = Object.keys(schema);

  if (keys.length === 0) {
    return null;
  }

  return (
    <>
      <Typography.Text
        strong
        style={{ display: "block", marginBlockEnd: 8 }}
      >{t`Paramètres`}</Typography.Text>
      {keys.map((key) => {
        const hint = schema[key];
        const error = errors[key];
        return (
          <Form.Item
            help={error}
            htmlFor={`parameter-${key}`}
            key={key}
            label={key}
            validateStatus={error ? "error" : undefined}
          >
            {hint === DICTIONARY ? (
              <Input.TextArea
                id={`parameter-${key}`}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
                placeholder='{"email": "…"}'
                rows={4}
                value={value[key] ?? ""}
              />
            ) : (
              <Input
                id={`parameter-${key}`}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
                placeholder={String(hint)}
                value={value[key] ?? ""}
              />
            )}
          </Form.Item>
        );
      })}
    </>
  );
}
