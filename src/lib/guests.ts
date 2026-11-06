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

export const MIN_GUEST_DELTA = -30;
export const MAX_GUEST_DELTA = 50;

/**
 * Normalizes a guest-count change to an integer in
 * [MIN_GUEST_DELTA, MAX_GUEST_DELTA]. The simulator's input carries
 * the same range as attributes, but the store enforces it too, so a
 * value arriving via persisted data, a shared link or a stray digit
 * can never push a prediction outside the range the UI promises.
 * Non-finite input falls back to 0 (no change).
 */
export function clampGuestDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(
    MAX_GUEST_DELTA,
    Math.max(MIN_GUEST_DELTA, Math.trunc(value)),
  );
}
