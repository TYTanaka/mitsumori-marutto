import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import {
  decodeShareParam,
  encodeShareParam,
  parseStateJson,
  stateToJson,
  validateState,
} from './dataTransfer';

describe('state validation and transfer', () => {
  it('accepts a well-formed state', () => {
    const result = validateState(createSeedState());

    expect(result.ok).toBe(true);
  });

  it('round-trips the full state through a share parameter', () => {
    const state = createSeedState();
    const decoded = decodeShareParam(encodeShareParam(state));

    expect(decoded).toEqual({ ...state, budget: null });
  });

  it('round-trips the full state through JSON export and import', () => {
    const state = createSeedState();
    const result = parseStateJson(stateToJson(state));

    expect(result).toEqual({ ok: true, state: { ...state, budget: null } });
  });

  it('rejects text that is not JSON', () => {
    const result = parseStateJson('{not json');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON');
    }
  });

  it('rejects an unsupported version', () => {
    const result = validateState({ ...createSeedState(), version: 2 });

    expect(result.ok).toBe(false);
  });

  it('rejects items pointing at a venue that does not exist', () => {
    const state = createSeedState();
    const broken = {
      ...state,
      items: [
        ...state.items,
        {
          id: 'x1',
          venueId: 'missing-venue',
          category: 'venue',
          name: 'x',
          amount: 100,
        },
      ],
    };

    expect(validateState(broken).ok).toBe(false);
  });

  it('rejects unknown categories and non-numeric amounts', () => {
    const state = createSeedState();

    const badCategory = {
      ...state,
      items: state.items.map((item, index) =>
        index === 0 ? { ...item, category: 'nope' } : item,
      ),
    };
    expect(validateState(badCategory).ok).toBe(false);

    const badAmount = {
      ...state,
      items: state.items.map((item, index) =>
        index === 0 ? { ...item, amount: '100' } : item,
      ),
    };
    expect(validateState(badAmount).ok).toBe(false);
  });

  it('rejects invalid assumption levels', () => {
    const state = createSeedState();
    const broken = {
      ...state,
      assumptions: {
        ...state.assumptions,
        va: { ...state.assumptions.va, attire: 'extreme' },
      },
    };

    expect(validateState(broken).ok).toBe(false);
  });

  it('returns null for a garbage share parameter', () => {
    expect(decodeShareParam('!!!not-base64!!!')).toBeNull();
    expect(decodeShareParam('aGVsbG8')).toBeNull(); // "hello", not JSON
  });
});
