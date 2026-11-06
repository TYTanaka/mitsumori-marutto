/**
 * Numeric input handling for money and headcount fields.
 *
 * Japanese users routinely type with an IME in full-width mode, so raw
 * field text is normalized before parsing: full-width digits, the
 * full-width minus sign and full-width spaces become their half-width
 * forms. Input that still is not a plain integer after normalization
 * is rejected (never silently dropped to 0), so the caller can show
 * an error instead of storing a wrong figure.
 */
export function normalizeNumericText(text: string): string {
  return text
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/－/g, '-')
    .replace(/＋/g, '+')
    .replace(/，/g, ',')
    .replace(/　/g, ' ');
}

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false };

/**
 * Parses a yen amount as typed into an amount field. Thousands
 * separators, the yen symbol and a 円 suffix are tolerated, and a
 * leading minus sign is honoured so discount lines can be entered as
 * negative amounts. Empty text is not a value: callers handle the
 * "cleared field" case themselves.
 */
export function parseYenInput(text: string): ParseResult {
  const normalized = normalizeNumericText(text)
    .replace(/[¥￥,\s]/g, '')
    .replace(/円$/, '');

  if (!/^[+-]?\d+$/.test(normalized)) {
    return { ok: false };
  }

  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

/**
 * Parses a headcount (base guests, guest delta). Same normalization
 * as amounts; anything that is not a plain integer is rejected.
 */
export function parseCountInput(text: string): ParseResult {
  const normalized = normalizeNumericText(text).replace(/[,\s]/g, '');

  if (!/^[+-]?\d+$/.test(normalized)) {
    return { ok: false };
  }

  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}
