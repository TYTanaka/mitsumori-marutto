import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppState, CategoryId, LineItem, UpliftLevel } from '../types';
import { defaultAssumptions } from '../lib/categories';
import { clampBaseGuests, clampGuestDelta } from '../lib/guests';
import { readSharedStateFromUrl } from '../lib/dataTransfer';
import { createSeedState } from '../lib/seed';

export type Action =
  | { type: 'addVenue'; name: string }
  | { type: 'removeVenue'; venueId: string }
  | { type: 'renameVenue'; venueId: string; name: string }
  | { type: 'setBaseGuests'; venueId: string; baseGuests: number }
  | { type: 'addItem'; venueId: string; category: CategoryId }
  | { type: 'updateItem'; item: LineItem }
  | { type: 'removeItem'; itemId: string }
  | {
      type: 'setAssumption';
      venueId: string;
      category: CategoryId;
      level: UpliftLevel;
    }
  | { type: 'setGuestDelta'; venueId: string; delta: number }
  | { type: 'setBudget'; budget: number | null }
  | { type: 'reset' }
  | { type: 'hydrate'; state: AppState };

function normalizeState(state: AppState): AppState {
  const guestDelta: Record<string, number> = {};
  for (const [venueId, delta] of Object.entries(state.guestDelta ?? {})) {
    guestDelta[venueId] = clampGuestDelta(delta);
  }

  return {
    ...state,
    venues: state.venues.map((venue, index) => ({
      ...venue,
      baseGuests: clampBaseGuests(venue.baseGuests),
      // A venue must never end up with a blank name: headings in the
      // comparison table and simulator would render empty. Fall back
      // to the positional default name instead.
      name: venue.name.trim() === '' ? `式場${index + 1}` : venue.name,
    })),
    items: state.items.map((item) => ({
      ...item,
      // Data from before the amountSet flag existed: a non-zero amount
      // must have been entered by someone, while a zero row is
      // indistinguishable from an untouched one.
      amountSet: item.amountSet ?? item.amount !== 0,
    })),
    guestDelta,
    budget:
      typeof state.budget === 'number' && Number.isFinite(state.budget)
        ? state.budget
        : null,
  };
}

let counter = 0;

function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addVenue': {
      const id = newId('venue');

      return {
        ...state,
        venues: [
          ...state.venues,
          {
            id,
            name: action.name || `式場${state.venues.length + 1}`,
            memo: '',
            baseGuests: 60,
          },
        ],
        assumptions: {
          ...state.assumptions,
          [id]: defaultAssumptions(),
        },
        guestDelta: { ...state.guestDelta, [id]: 0 },
      };
    }

    case 'removeVenue': {
      const assumptions = { ...state.assumptions };
      const guestDelta = { ...state.guestDelta };
      delete assumptions[action.venueId];
      delete guestDelta[action.venueId];

      return {
        ...state,
        venues: state.venues.filter((venue) => venue.id !== action.venueId),
        items: state.items.filter((item) => item.venueId !== action.venueId),
        assumptions,
        guestDelta,
      };
    }

    case 'renameVenue': {
      // Blank or whitespace-only names are rejected so a venue can
      // never lose its heading; the editor also discards blank drafts.
      const trimmed = action.name.trim();

      return {
        ...state,
        venues: state.venues.map((venue) =>
          venue.id === action.venueId && trimmed !== ''
            ? { ...venue, name: trimmed }
            : venue,
        ),
      };
    }

    case 'setBaseGuests':
      return {
        ...state,
        venues: state.venues.map((venue) =>
          venue.id === action.venueId
            ? { ...venue, baseGuests: clampBaseGuests(action.baseGuests) }
            : venue,
        ),
      };

    case 'addItem':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: newId('item'),
            venueId: action.venueId,
            category: action.category,
            name: '',
            amount: 0,
            amountSet: false,
          },
        ],
      };

    case 'updateItem':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? { ...action.item } : item,
        ),
      };

    case 'removeItem':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
      };

    case 'setAssumption':
      return {
        ...state,
        assumptions: {
          ...state.assumptions,
          [action.venueId]: {
            ...(state.assumptions[action.venueId] ?? defaultAssumptions()),
            [action.category]: action.level,
          },
        },
      };

    case 'setGuestDelta':
      return {
        ...state,
        guestDelta: {
          ...state.guestDelta,
          // The range is enforced here, not only by the input's
          // attributes, so out-of-range values can never reach the
          // prediction math.
          [action.venueId]: clampGuestDelta(action.delta),
        },
      };

    case 'setBudget':
      return {
        ...state,
        budget:
          action.budget !== null && Number.isFinite(action.budget)
            ? Math.max(0, Math.trunc(action.budget))
            : null,
      };

    case 'reset':
      return createSeedState();

    case 'hydrate':
      // Persisted states from before guest-count validation existed may
      // hold 0 or negative headcounts (or blank venue names); normalize
      // them on the way in.
      return normalizeState(action.state);
  }
}

const STORAGE_KEY = 'mitsumori-state-v1';

function loadInitialState(): AppState {
  // A shared link carries the sender's whole dataset; it wins over
  // whatever this browser has stored, since opening the link is an
  // explicit request to see that data.
  try {
    const shared = readSharedStateFromUrl();
    if (shared !== null) {
      return normalizeState(shared);
    }
  } catch {
    // Malformed fragments fall through to the stored state.
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        parsed.version === 1 &&
        'venues' in parsed &&
        Array.isArray(parsed.venues) &&
        'items' in parsed &&
        Array.isArray(parsed.items)
      ) {
        return normalizeState(parsed as AppState);
      }
    }
  } catch {
    // Unavailable storage or invalid JSON falls back to the seed.
  }

  // The seed goes through the same normalization as loaded data, so
  // derived fields (amountSet, budget) are populated on first run too.
  return normalizeState(createSeedState());
}

const AppStateContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
  /** True when the latest attempt to persist state to localStorage failed. */
  saveFailed: boolean;
} | null>(null);

// Save-failure status as a tiny external store: the persistence
// effect below reports into it, and the provider reads it with
// useSyncExternalStore (avoids setState-in-effect for a value that
// genuinely comes from an external system).
let saveFailedValue = false;
const saveFailedListeners = new Set<() => void>();

function reportSaveResult(failed: boolean) {
  if (saveFailedValue === failed) return;
  saveFailedValue = failed;
  saveFailedListeners.forEach((listener) => listener());
}

function subscribeSaveFailed(listener: () => void) {
  saveFailedListeners.add(listener);
  return () => {
    saveFailedListeners.delete(listener);
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const saveFailed = useSyncExternalStore(
    subscribeSaveFailed,
    () => saveFailedValue,
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      reportSaveResult(false);
    } catch {
      // Keep the app usable when storage is unavailable, but surface
      // the failure instead of silently dropping the user's data.
      reportSaveResult(true);
    }
  }, [state]);

  return (
    <AppStateContext.Provider value={{ state, dispatch, saveFailed }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (context === null) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
