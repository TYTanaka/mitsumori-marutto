import type { AppState, Assumptions, CategoryId, UpliftLevel } from '../types';
import { CATEGORIES, defaultAssumptions } from './categories';

export type StateValidation =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((category) => category.id));
const UPLIFT_LEVELS = new Set<string>(['none', 'standard', 'high']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates an unknown value as an AppState, strictly. Used for JSON
 * imports and shared links, where data arrives from outside the app:
 * anything malformed (wrong version, dangling venue references,
 * unknown categories, non-numeric amounts) is rejected wholesale with
 * a reason, never partially applied.
 */
export function validateState(value: unknown): StateValidation {
  const fail = (error: string): StateValidation => ({ ok: false, error });

  if (!isRecord(value)) {
    return fail('データがオブジェクトではありません');
  }
  if (value.version !== 1) {
    return fail('対応していないデータ形式です（version）');
  }
  if (!Array.isArray(value.venues) || !Array.isArray(value.items)) {
    return fail('式場・項目のデータが見つかりません');
  }

  const venueIds = new Set<string>();
  for (const venue of value.venues as unknown[]) {
    if (
      !isRecord(venue) ||
      typeof venue.id !== 'string' ||
      venue.id === '' ||
      typeof venue.name !== 'string' ||
      (venue.memo !== undefined && typeof venue.memo !== 'string') ||
      !isFiniteNumber(venue.baseGuests)
    ) {
      return fail('式場のデータに不正な値があります');
    }
    venueIds.add(venue.id);
  }

  for (const item of value.items as unknown[]) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.venueId !== 'string' ||
      !venueIds.has(item.venueId) ||
      typeof item.category !== 'string' ||
      !CATEGORY_IDS.has(item.category) ||
      typeof item.name !== 'string' ||
      !isFiniteNumber(item.amount) ||
      (item.mode !== undefined &&
        item.mode !== 'total' &&
        item.mode !== 'perHead') ||
      (item.unitPrice !== undefined && !isFiniteNumber(item.unitPrice)) ||
      (item.amountSet !== undefined && typeof item.amountSet !== 'boolean')
    ) {
      return fail('見積もり項目のデータに不正な値があります');
    }
  }

  if (!isRecord(value.assumptions) || !isRecord(value.guestDelta)) {
    return fail('想定・人数増減のデータが見つかりません');
  }
  for (const [venueId, assumptions] of Object.entries(value.assumptions)) {
    if (!venueIds.has(venueId) || !isRecord(assumptions)) {
      return fail('想定のデータに不正な値があります');
    }
    for (const level of Object.values(assumptions)) {
      if (typeof level !== 'string' || !UPLIFT_LEVELS.has(level)) {
        return fail('想定のデータに不正な値があります');
      }
    }
  }
  for (const delta of Object.values(value.guestDelta)) {
    if (!isFiniteNumber(delta)) {
      return fail('人数増減のデータに不正な値があります');
    }
  }
  if (
    value.budget !== undefined &&
    value.budget !== null &&
    !isFiniteNumber(value.budget)
  ) {
    return fail('予算のデータに不正な値があります');
  }

  // Rebuild assumptions per venue so every category has a valid level,
  // even if the source omitted some.
  const assumptions: Record<string, Assumptions> = {};
  for (const venue of value.venues as { id: string }[]) {
    const source = (value.assumptions as Record<string, unknown>)[venue.id];
    const merged = defaultAssumptions();
    if (isRecord(source)) {
      for (const category of CATEGORIES) {
        const level = source[category.id];
        if (typeof level === 'string' && UPLIFT_LEVELS.has(level)) {
          merged[category.id as CategoryId] = level as UpliftLevel;
        }
      }
    }
    assumptions[venue.id] = merged;
  }

  return {
    ok: true,
    state: {
      version: 1,
      venues: value.venues as AppState['venues'],
      items: value.items as AppState['items'],
      assumptions,
      guestDelta: value.guestDelta as Record<string, number>,
      budget: (value.budget as number | null | undefined) ?? null,
    },
  };
}

/** Serializes the state as a downloadable JSON document. */
export function stateToJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/** Parses and validates an imported JSON document. */
export function parseStateJson(text: string): StateValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONとして読み取れませんでした' };
  }

  return validateState(parsed);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(param: string): string | null {
  try {
    const base64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Encodes the whole state into a URL-safe parameter so a shared link
 * can reproduce the sender's data on another device. Kept in the URL
 * fragment, which is never sent to a server.
 */
export function encodeShareParam(state: AppState): string {
  return toBase64Url(JSON.stringify(state));
}

/** Decodes a share parameter; returns null for anything invalid. */
export function decodeShareParam(param: string): AppState | null {
  const text = fromBase64Url(param);
  if (text === null) return null;

  const result = parseStateJson(text);
  return result.ok ? result.state : null;
}

/** Builds the full share URL for the current page. */
export function buildShareUrl(state: AppState): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#d=${encodeShareParam(state)}`;
}

/**
 * Reads a shared state from the current URL fragment, if present.
 * Returns null when there is no (valid) shared data.
 */
export function readSharedStateFromUrl(): AppState | null {
  const match = window.location.hash.match(/#d=([A-Za-z0-9_-]+)/);
  if (!match) return null;

  return decodeShareParam(match[1]);
}
