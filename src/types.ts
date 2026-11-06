export type CategoryId =
  | 'venue'
  | 'attire'
  | 'food'
  | 'flowers'
  | 'photo'
  | 'gifts'
  | 'paper'
  | 'production'
  | 'other';

export type UpliftLevel = 'none' | 'standard' | 'high';

/**
 * How a line item's amount is entered:
 * - 'total': the amount is the total for the item, as written.
 * - 'perHead': the amount is derived from a per-guest unit price
 *   (unitPrice × the venue's baseGuests) and follows the guest count
 *   whenever either changes.
 */
export type ItemMode = 'total' | 'perHead';

export interface Venue {
  id: string;
  name: string;
  memo: string;
  baseGuests: number;
}

export interface LineItem {
  id: string;
  venueId: string;
  category: CategoryId;
  name: string;
  /**
   * Effective total in yen. May be negative: discount lines
   * (値引き・特典) are entered as negative amounts and reduce the
   * venue total, exactly as they do on the venue's own estimate.
   */
  amount: number;
  /** Entry mode. Absent in older data, where it means 'total'. */
  mode?: ItemMode;
  /** Per-guest unit price; only meaningful when mode is 'perHead'. */
  unitPrice?: number;
  /**
   * Whether an amount has ever been committed for this row. A freshly
   * added row starts unset, so the editor can tell 「¥0と登録した」
   * apart from 「まだ入力していない」. Absent in older data and
   * derived on load (amount ≠ 0 counts as set).
   */
  amountSet?: boolean;
}

export type Assumptions = Record<CategoryId, UpliftLevel>;

export interface AppState {
  version: 1;
  venues: Venue[];
  items: LineItem[];
  assumptions: Record<string, Assumptions>;
  guestDelta: Record<string, number>;
  /** Budget cap in yen. null/absent = no budget set. */
  budget?: number | null;
}
