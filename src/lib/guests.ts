export const MIN_BASE_GUESTS = 1;
export const MAX_BASE_GUESTS = 1000;

/**
 * Normalizes a guest count to a valid integer in
 * [MIN_BASE_GUESTS, MAX_BASE_GUESTS]. Non-finite input (NaN from an
 * unparseable field, etc.) falls back to the minimum so the app never
 * holds an invalid headcount that would break per-head conversions.
 */
export function clampBaseGuests(value: number): number {
  if (!Number.isFinite(value)) return MIN_BASE_GUESTS;

  return Math.min(
    MAX_BASE_GUESTS,
    Math.max(MIN_BASE_GUESTS, Math.trunc(value)),
  );
}
