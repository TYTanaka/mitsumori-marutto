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

  it('clamps base guests to the valid range', () => {
    const initial = createSeedState();
    const venueId = initial.venues[0]!.id;
    const guestsAfter = (baseGuests: number) =>
      reducer(initial, { type: 'setBaseGuests', venueId, baseGuests })
        .venues[0]?.baseGuests;

    expect(guestsAfter(80)).toBe(80);
    expect(guestsAfter(0)).toBe(1);
    expect(guestsAfter(-20)).toBe(1);
    expect(guestsAfter(45.9)).toBe(45);
    expect(guestsAfter(5000)).toBe(1000);
    expect(guestsAfter(Number.NaN)).toBe(1);
  });

  it('normalizes invalid guest counts when hydrating', () => {
    const initial = createSeedState();
    const broken: typeof initial = {
      ...initial,
      venues: initial.venues.map((venue) => ({ ...venue, baseGuests: 0 })),
    };
    const hydrated = reducer(initial, { type: 'hydrate', state: broken });

    expect(hydrated.venues.every((venue) => venue.baseGuests >= 1)).toBe(
      true,
    );
  });

  it('rejects blank venue names and trims surrounding space', () => {
    const initial = createSeedState();

    const blanked = reducer(initial, {
      type: 'renameVenue',
      venueId: 'va',
      name: '   ',
    });
    expect(blanked.venues[0].name).toBe('青山ガーデンテラス');

    const renamed = reducer(initial, {
      type: 'renameVenue',
      venueId: 'va',
      name: '  新しい式場  ',
    });
    expect(renamed.venues[0].name).toBe('新しい式場');
  });

  it('restores a fallback name for blank venue names when hydrating', () => {
    const initial = createSeedState();
    const broken: typeof initial = {
      ...initial,
      venues: initial.venues.map((venue, index) =>
        index === 0 ? { ...venue, name: '' } : venue,
      ),
    };
    const hydrated = reducer(initial, { type: 'hydrate', state: broken });

    expect(hydrated.venues[0].name).toBe('式場1');
    expect(hydrated.venues[1].name).toBe('横浜ベイサイドホール');
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
