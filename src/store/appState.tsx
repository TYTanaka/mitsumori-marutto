import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppState, CategoryId, LineItem, UpliftLevel } from '../types';
import { defaultAssumptions } from '../lib/categories';
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
  | { type: 'reset' }
  | { type: 'hydrate'; state: AppState };

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

    case 'renameVenue':
      return {
        ...state,
        venues: state.venues.map((venue) =>
          venue.id === action.venueId
            ? { ...venue, name: action.name }
            : venue,
        ),
      };

    case 'setBaseGuests':
      return {
        ...state,
        venues: state.venues.map((venue) =>
          venue.id === action.venueId
            ? { ...venue, baseGuests: action.baseGuests }
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
          [action.venueId]: action.delta,
        },
      };

    case 'reset':
      return createSeedState();

    case 'hydrate':
      return action.state;
  }
}

const STORAGE_KEY = 'mitsumori-state-v1';

function loadInitialState(): AppState {
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
        return parsed as AppState;
      }
    }
  } catch {
    // Unavailable storage or invalid JSON falls back to the seed.
  }

  return createSeedState();
}

const AppStateContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Keep the app usable when storage is unavailable.
    }
  }, [state]);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
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
