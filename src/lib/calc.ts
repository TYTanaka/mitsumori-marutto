import type { AppState, CategoryId, LineItem } from '../types';
import { CATEGORIES, PER_HEAD_CATEGORIES } from './categories';

export function venueItems(state: AppState, venueId: string): LineItem[] {
  return state.items.filter((item) => item.venueId === venueId);
}

/**
 * The amount an item contributes to totals. Items entered as
 * 単価×人数 (mode 'perHead') derive their amount from the unit price
 * and the venue's current guest count, so their totals follow the
 * headcount automatically; all other items use their stored amount.
 */
export function effectiveItemAmount(state: AppState, item: LineItem): number {
  if (item.mode === 'perHead' && typeof item.unitPrice === 'number') {
    const venue = state.venues.find((entry) => entry.id === item.venueId);
    if (venue) return item.unitPrice * venue.baseGuests;
  }

  return item.amount;
}

export function categoryTotal(
  state: AppState,
  venueId: string,
  category: CategoryId,
): number {
  return venueItems(state, venueId).reduce(
    (total, item) =>
      total +
      (item.category === category ? effectiveItemAmount(state, item) : 0),
    0,
  );
}

/**
 * How many line items a venue has registered in a category.
 * Zero means the category is not on that venue's estimate at all (未計上),
 * which is different from a registered item whose amount happens to be ¥0.
 */
export function categoryItemCount(
  state: AppState,
  venueId: string,
  category: CategoryId,
): number {
  return venueItems(state, venueId).filter(
    (item) => item.category === category,
  ).length;
}

/**
 * Categories in which a venue has no line item at all (未計上), in
 * CATEGORIES order. Predictions and totals for such a venue silently
 * treat these as ¥0, so callers surface them as warnings wherever a
 * total or ranking is presented as a basis for deciding.
 */
export function uncountedCategories(
  state: AppState,
  venueId: string,
): CategoryId[] {
  return CATEGORIES.filter(
    (category) => categoryItemCount(state, venueId, category.id) === 0,
  ).map((category) => category.id);
}

/**
 * The subset of uncounted categories that scale with the guest count.
 * When one of these is missing, the per-head conversion behind the
 * guest-delta adjustment is understated, so a change in headcount
 * looks smaller than it will really be.
 */
export function uncountedPerHeadCategories(
  state: AppState,
  venueId: string,
): CategoryId[] {
  return PER_HEAD_CATEGORIES.filter(
    (category) => categoryItemCount(state, venueId, category) === 0,
  );
}

export function venueTotal(state: AppState, venueId: string): number {
  return venueItems(state, venueId).reduce(
    (total, item) => total + effectiveItemAmount(state, item),
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

    // A category whose net total is zero or negative (e.g. discount
    // lines outweighing the items) is kept as-is: a discount does not
    // "grow" the way an under-scoped category does, and multiplying a
    // negative base by (1 + rate) would invert the low/high order.
    if (level === 'none' || base <= 0) {
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
    /**
     * Cell amount per venue. `null` means the venue has no line item in
     * this category at all (未計上) — it must not be rendered as ¥0.
     * A real `0` means an item is registered with an amount of ¥0.
     */
    cells: Record<string, number | null>;
    cheapestVenueId: string | null;
  }[];
  totals: Record<string, number>;
} {
  const categories = CATEGORIES.map((category) => category.id);
  const rows = categories.map((category) => {
    const cells: Record<string, number | null> = {};
    let cheapestVenueId: string | null = null;
    let cheapestAmount = Infinity;

    for (const venue of state.venues) {
      const amount =
        categoryItemCount(state, venue.id, category) === 0
          ? null
          : categoryTotal(state, venue.id, category);
      cells[venue.id] = amount;

      // Only real, positive amounts compete for cheapest: a missing
      // category (null) and a registered ¥0 item are both excluded,
      // matching how the totals footnote describes the sums.
      if (amount !== null && amount > 0 && amount < cheapestAmount) {
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

/**
 * A venue with no line items at all is 未入力 (not yet entered), not
 * a ¥0 estimate. Its "total" is an absence of data, so it must not
 * take part in rankings: a ¥0 placeholder would otherwise occupy
 * first place and distort every other venue's rank.
 */
export function isVenueUnentered(state: AppState, venueId: string): boolean {
  return venueItems(state, venueId).length === 0;
}

export function rankingByBase(state: AppState): string[] {
  return state.venues
    .filter((venue) => !isVenueUnentered(state, venue.id))
    .map((venue) => ({ id: venue.id, total: venueTotal(state, venue.id) }))
    .sort((a, b) => a.total - b.total)
    .map((venue) => venue.id);
}

export function rankingByPredicted(state: AppState): string[] {
  return state.venues
    .filter((venue) => !isVenueUnentered(state, venue.id))
    .map((venue) => ({ id: venue.id, mid: predictTotal(state, venue.id).mid }))
    .sort((a, b) => a.mid - b.mid)
    .map((venue) => venue.id);
}

export type BudgetStatus = 'within' | 'borderline' | 'over';

/**
 * How a prediction sits against the budget cap: 'within' when even
 * the high end fits, 'over' when even the low end exceeds it, and
 * 'borderline' when the range straddles the budget.
 */
export function budgetStatus(
  prediction: Prediction,
  budget: number,
): BudgetStatus {
  if (prediction.high <= budget) return 'within';
  if (prediction.low > budget) return 'over';
  return 'borderline';
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
