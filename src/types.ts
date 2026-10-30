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
  amount: number;
}

export type Assumptions = Record<CategoryId, UpliftLevel>;

export interface AppState {
  version: 1;
  venues: Venue[];
  items: LineItem[];
  assumptions: Record<string, Assumptions>;
  guestDelta: Record<string, number>;
}
