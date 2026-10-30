import { describe, it, expect } from 'vitest';
import type { AppState, Assumptions } from '../types';
import { CATEGORIES, defaultAssumptions } from './categories';
import {
  categoryTotal,
  comparisonMatrix,
  perHeadCost,
  predictTotal,
  rankingByBase,
  rankingByPredicted,
  rankingFlips,
  venueTotal,
} from './calc';

function fixture(): AppState {
  return {
    version: 1,
    venues: [
      { id: 'v1', name: 'Venue 1', memo: '', baseGuests: 60 },
      { id: 'v2', name: 'Venue 2', memo: '', baseGuests: 50 },
    ],
    items: [
      {
        id: 'i1',
        venueId: 'v1',
        category: 'venue',
        name: 'Venue',
        amount: 200_000,
      },
      {
        id: 'i2',
        venueId: 'v1',
        category: 'attire',
        name: 'Attire',
        amount: 500_000,
      },
      {
        id: 'i3',
        venueId: 'v1',
        category: 'food',
        name: 'Food',
        amount: 600_000,
      },
      {
        id: 'i4',
        venueId: 'v1',
        category: 'gifts',
        name: 'Gifts',
        amount: 120_000,
      },
      {
        id: 'i5',
        venueId: 'v1',
        category: 'paper',
        name: 'Paper',
        amount: 30_000,
      },
      {
        id: 'i6',
        venueId: 'v1',
        category: 'food',
        name: 'Drinks',
        amount: 10_000,
      },
      {
        id: 'i7',
        venueId: 'v2',
        category: 'venue',
        name: 'Venue',
        amount: 200_000,
      },
      {
        id: 'i8',
        venueId: 'v2',
        category: 'attire',
        name: 'Attire',
        amount: 100_000,
      },
      {
        id: 'i9',
        venueId: 'v2',
        category: 'food',
        name: 'Food',
        amount: 650_000,
      },
    ],
    assumptions: {
      v1: defaultAssumptions(),
      v2: defaultAssumptions(),
    },
    guestDelta: {},
  };
}

function noUplift(): Assumptions {
  const assumptions = defaultAssumptions();
  for (const category of CATEGORIES) {
    assumptions[category.id] = 'none';
  }
  return assumptions;
}

describe('calculations', () => {
  it('sums venue and category totals correctly', () => {
    const state = fixture();

    expect(categoryTotal(state, 'v1', 'food')).toBe(610_000);
    expect(categoryTotal(state, 'v1', 'flowers')).toBe(0);
    expect(venueTotal(state, 'v1')).toBe(1_460_000);
    expect(venueTotal(state, 'v2')).toBe(950_000);
  });

  it('rounds per-head costs from food, gifts, and paper', () => {
    const state = fixture();

    expect(perHeadCost(state, 'v1')).toBe(12_667);
    expect(perHeadCost(state, 'v2')).toBe(13_000);

    state.venues = state.venues.map((venue) => ({
      ...venue,
      baseGuests: 0,
    }));
    expect(perHeadCost(state, 'v1')).toBe(0);
  });

  it('keeps predictions equal to base with no uplift or guest delta', () => {
    const state = fixture();
    state.assumptions.v1 = noUplift();
    state.guestDelta.v1 = 0;

    const prediction = predictTotal(state, 'v1');

    expect(prediction.base).toBe(1_460_000);
    expect(prediction.low).toBe(prediction.base);
    expect(prediction.high).toBe(prediction.base);
    expect(prediction.mid).toBe(prediction.base);
  });

  it('applies standard attire uplift to a 500000 yen base', () => {
    const state = fixture();

    expect(
      predictTotal(state, 'v1').byCategory.find(
        (category) => category.category === 'attire',
      ),
    ).toEqual({
      category: 'attire',
      base: 500_000,
      low: 600_000,
      high: 700_000,
    });
  });

  it('adds the base per-head cost once for each additional guest', () => {
    const state = fixture();
    const before = predictTotal(state, 'v1');
    state.guestDelta.v1 = 10;
    const after = predictTotal(state, 'v1');
    const expectedEffect = 126_670;

    expect(after.low - before.low).toBe(expectedEffect);
    expect(after.high - before.high).toBe(expectedEffect);
    expect(after.base).toBe(before.base);
    expect(after.byCategory).toEqual(before.byCategory);
  });

  it('compares positive category totals and includes venue totals', () => {
    const state = fixture();
    const matrix = comparisonMatrix(state);

    expect(matrix.categories).toEqual(CATEGORIES.map((category) => category.id));
    expect(matrix.rows.find((row) => row.category === 'food')).toEqual({
      category: 'food',
      cells: { v1: 610_000, v2: 650_000 },
      cheapestVenueId: 'v1',
    });
    expect(
      matrix.rows.find((row) => row.category === 'attire')?.cheapestVenueId,
    ).toBe('v2');
    expect(
      matrix.rows.find((row) => row.category === 'gifts')?.cheapestVenueId,
    ).toBe('v1');
    expect(
      matrix.rows.find((row) => row.category === 'flowers')?.cheapestVenueId,
    ).toBeNull();
    expect(
      matrix.rows.find((row) => row.category === 'venue')?.cheapestVenueId,
    ).toBe('v1');
    expect(matrix.totals).toEqual({
      v1: venueTotal(state, 'v1'),
      v2: venueTotal(state, 'v2'),
    });
  });

  it('detects rank flips caused by differing category uplifts', () => {
    const state = fixture();
    state.items = [
      {
        id: 'flip1',
        venueId: 'v1',
        category: 'attire',
        name: 'Attire',
        amount: 1_000_000,
      },
      {
        id: 'flip2',
        venueId: 'v2',
        category: 'attire',
        name: 'Attire',
        amount: 10_000,
      },
      {
        id: 'flip3',
        venueId: 'v2',
        category: 'venue',
        name: 'Venue',
        amount: 1_040_000,
      },
    ];

    expect(rankingByBase(state)).toEqual(['v1', 'v2']);
    expect(rankingByPredicted(state)).toEqual(['v2', 'v1']);
    expect(rankingFlips(state)).toEqual([
      { venueId: 'v1', baseRank: 1, predictedRank: 2 },
      { venueId: 'v2', baseRank: 2, predictedRank: 1 },
    ]);
  });

  it('applies negative guest deltas and clamps prediction totals to zero', () => {
    const state = fixture();
    const before = predictTotal(state, 'v1');

    state.guestDelta.v1 = -10;
    const reduced = predictTotal(state, 'v1');
    expect(reduced.low).toBe(before.low - 126_670);
    expect(reduced.high).toBe(before.high - 126_670);

    state.guestDelta.v1 = -1_000;
    const clamped = predictTotal(state, 'v1');
    expect(clamped.low).toBe(0);
    expect(clamped.high).toBe(0);
    expect(clamped.mid).toBe(0);
    expect(clamped.base).toBe(before.base);
  });
});
