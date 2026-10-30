import { describe, expect, it } from 'vitest';
import { predictTotal, rankingFlips, venueTotal } from '../lib/calc';
import { createSeedState } from '../lib/seed';
import { reducer } from './appState';

describe('app state reducer', () => {
  it('creates three venues with the specified totals', () => {
    const state = createSeedState();

    expect(state.venues).toHaveLength(3);
    expect(venueTotal(state, 'va')).toBe(2056000);
    expect(venueTotal(state, 'vb')).toBe(2314000);
    expect(venueTotal(state, 'vc')).toBe(3110000);
  });

  it('identifies the ranking flip between va and vb', () => {
    const flips = rankingFlips(createSeedState());
    const serialized = JSON.stringify(flips);

    expect(serialized).toContain('"va"');
    expect(serialized).toContain('"vb"');
  });

  it('adds a venue and item, then updates its total', () => {
    let state = reducer(createSeedState(), {
      type: 'addVenue',
      name: '',
    });
    const venue = state.venues[state.venues.length - 1]!;

    expect(venue.name).toBe('式場4');
    expect(venue.baseGuests).toBe(60);
    expect(venue.memo).toBe('');
    expect(state.guestDelta[venue.id]).toBe(0);
    expect(venueTotal(state, venue.id)).toBe(0);

    state = reducer(state, {
      type: 'addItem',
      venueId: venue.id,
      category: 'venue',
    });
    const item = state.items[state.items.length - 1]!;

    expect(item.name).toBe('');
    expect(item.amount).toBe(0);
    expect(venueTotal(state, venue.id)).toBe(0);

    state = reducer(state, {
      type: 'updateItem',
      item: { ...item, name: '会場使用料', amount: 123000 },
    });

    expect(venueTotal(state, venue.id)).toBe(123000);
  });

  it('removes a venue and its items, assumptions, and guest delta', () => {
    const initial = createSeedState();
    const state = reducer(initial, {
      type: 'removeVenue',
      venueId: 'va',
    });

    expect(state.venues.some((venue) => venue.id === 'va')).toBe(false);
    expect(state.items.some((item) => item.venueId === 'va')).toBe(false);
    expect(state.assumptions).not.toHaveProperty('va');
    expect(state.guestDelta).not.toHaveProperty('va');
    expect(state.venues).toHaveLength(2);
    expect(initial.venues).toHaveLength(3);
    expect(initial.assumptions).toHaveProperty('va');
  });

  it('updates predictions when assumptions and guest delta change', () => {
    const initial = createSeedState();
    const initialMid = predictTotal(initial, 'va').mid;

    const withoutAttireUplift = reducer(initial, {
      type: 'setAssumption',
      venueId: 'va',
      category: 'attire',
      level: 'none',
    });

    expect(withoutAttireUplift.assumptions.va?.attire).toBe('none');
    expect(predictTotal(withoutAttireUplift, 'va').mid).toBeLessThan(initialMid);

    const moreGuests = reducer(withoutAttireUplift, {
      type: 'setGuestDelta',
      venueId: 'va',
      delta: 20,
    });

    expect(moreGuests.guestDelta.va).toBe(20);
    expect(predictTotal(moreGuests, 'va').mid).toBeGreaterThan(
      predictTotal(withoutAttireUplift, 'va').mid,
    );
  });

  it('resets to the seed state', () => {
    const modified = reducer(createSeedState(), {
      type: 'removeVenue',
      venueId: 'va',
    });
    const reset = reducer(modified, { type: 'reset' });

    expect(reset.venues).toHaveLength(3);
    expect(reset).toEqual(createSeedState());
  });
});
