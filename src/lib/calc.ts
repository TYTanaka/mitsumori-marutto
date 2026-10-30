import type { AppState, CategoryId, LineItem } from '../types';
import { CATEGORIES, PER_HEAD_CATEGORIES } from './categories';

export function venueItems(state: AppState, venueId: string): LineItem[] {
  return state.items.filter((item) => item.venueId === venueId);
}

export function categoryTotal(
  state: AppState,
  venueId: string,
  category: CategoryId,
): number {
  return venueItems(state, venueId).reduce(
    (total, item) => total + (item.category === category ? item.amount : 0),
    0,
  );
}

export function venueTotal(state: AppState, venueId: string): number {
  return venueItems(state, venueId).reduce(
    (total, item) => total + item.amount,
    0,
  );
}

export function perHeadCost(state: AppState, venueId: string): number {
  const venue = state.venues.find((entry) => entry.id === venueId);
  if (!venue || venue.baseGuests <= 0) return 0;

  const total = PER_HEAD_CATEGORIES.reduce(
    (sum, category) => sum + categoryTotal(state, venueId, category),
    0,
  );

  return Math.round(total / venue.baseGuests);
}

export interface CategoryPrediction {
  category: CategoryId;
  base: number;
  low: number;
  high: number;
}

export interface Prediction {
  base: number;
  low: number;
  high: number;
  mid: number;
  byCategory: CategoryPrediction[];
}

export function predictTotal(state: AppState, venueId: string): Prediction {
  const byCategory: CategoryPrediction[] = CATEGORIES.map((category) => {
    const base = categoryTotal(state, venueId, category.id);
    const level = state.assumptions[venueId]?.[category.id] ?? 'standard';

    if (level === 'none') {
      return { category: category.id, base, low: base, high: base };
    }

    const [min, max] = category.uplift[level];
    return {
      category: category.id,
      base,
      low: Math.round(base * (1 + min)),
      high: Math.round(base * (1 + max)),
    };
  });

  const delta = state.guestDelta[venueId] ?? 0;
  const guestEffect = perHeadCost(state, venueId) * delta;
  const low = Math.max(
    0,
    byCategory.reduce((sum, category) => sum + category.low, 0) + guestEffect,
  );
  const high = Math.max(
    0,
    byCategory.reduce((sum, category) => sum + category.high, 0) + guestEffect,
  );

  return {
    base: venueTotal(state, venueId),
    low,
    high,
    mid: Math.round((low + high) / 2),
    byCategory,
  };
}

export function comparisonMatrix(state: AppState): {
  categories: CategoryId[];
  rows: {
    category: CategoryId;
    cells: Record<string, number>;
    cheapestVenueId: string | null;
  }[];
  totals: Record<string, number>;
} {
  const categories = CATEGORIES.map((category) => category.id);
  const rows = categories.map((category) => {
    const cells: Record<string, number> = {};
    let cheapestVenueId: string | null = null;
    let cheapestAmount = Infinity;

    for (const venue of state.venues) {
      const amount = categoryTotal(state, venue.id, category);
      cells[venue.id] = amount;

      if (amount > 0 && amount < cheapestAmount) {
        cheapestAmount = amount;
        cheapestVenueId = venue.id;
      }
    }

    return { category, cells, cheapestVenueId };
  });

  const totals: Record<string, number> = {};
  for (const venue of state.venues) {
    totals[venue.id] = venueTotal(state, venue.id);
  }

  return { categories, rows, totals };
}

export function rankingByBase(state: AppState): string[] {
  return state.venues
    .map((venue) => ({ id: venue.id, total: venueTotal(state, venue.id) }))
    .sort((a, b) => a.total - b.total)
    .map((venue) => venue.id);
}

export function rankingByPredicted(state: AppState): string[] {
  return state.venues
    .map((venue) => ({ id: venue.id, mid: predictTotal(state, venue.id).mid }))
    .sort((a, b) => a.mid - b.mid)
    .map((venue) => venue.id);
}

export function rankingFlips(state: AppState): {
  venueId: string;
  baseRank: number;
  predictedRank: number;
}[] {
  const baseRanking = rankingByBase(state);
  const predictedRanking = rankingByPredicted(state);

  return state.venues
    .map((venue) => ({
      venueId: venue.id,
      baseRank: baseRanking.indexOf(venue.id) + 1,
      predictedRank: predictedRanking.indexOf(venue.id) + 1,
    }))
    .filter((venue) => venue.baseRank !== venue.predictedRank);
}
