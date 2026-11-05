import { useState } from 'react';
import type { CategoryId } from '../types';
import { CATEGORIES } from '../lib/categories';
import { venueItems, venueTotal } from '../lib/calc';
import { yen } from '../lib/format';
import { MAX_BASE_GUESTS, MIN_BASE_GUESTS } from '../lib/guests';
import { useAppState } from '../store/appState';
import { EmptyState } from './EmptyState';

/**
 * Venue name field with the same draft pattern as GuestsInput: the raw
 * text is held locally while editing and only committed on blur (or
 * Enter). A blank draft is discarded, so a venue can never be renamed
 * to an empty string and lose its headings in the other tabs.
 */
function VenueNameInput({
  venueId,
  name,
}: {
  venueId: string;
  name: string;
}) {
  const { dispatch } = useAppState();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    const trimmed = draft.trim();
    if (trimmed !== '' && trimmed !== name) {
      dispatch({ type: 'renameVenue', venueId, name: trimmed });
    }
    setDraft(null);
  };

  return (
    <input
      className="input venue-name"
      aria-label="式場名"
      value={draft ?? name}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function GuestsInput({
  venueId,
  baseGuests,
}: {
  venueId: string;
  baseGuests: number;
}) {
  const { dispatch } = useAppState();
  // null = not editing: the field mirrors the stored (always valid) value.
  // While editing it holds the raw text, so the field can be emptied or
  // partially typed without the store being fed half-finished values;
  // the text is only committed on blur (or Enter, which blurs).
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    const parsed = Number.parseInt(draft, 10);
    if (!Number.isNaN(parsed)) {
      // The reducer clamps this to the valid range (minimum 1).
      dispatch({ type: 'setBaseGuests', venueId, baseGuests: parsed });
    }
    // Empty or unparseable input discards the draft, so the field falls
    // back to the last valid stored value instead of staying blank.
    setDraft(null);
  };

  return (
    <label>
      想定人数
      <input
        className="input guests-input"
        type="number"
        inputMode="numeric"
        min={MIN_BASE_GUESTS}
        max={MAX_BASE_GUESTS}
        value={draft ?? String(baseGuests)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function EstimateEditor({
  onShowComparison,
}: {
  onShowComparison?: () => void;
}) {
  const { state, dispatch } = useAppState();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, CategoryId>>({});

  if (state.venues.length === 0) {
    return (
      <EmptyState
        message="まだ式場が登録されていません。式場を追加すると、見積もりの入力を始められます。"
        actionLabel="式場を追加する"
        onAction={() => dispatch({ type: 'addVenue', name: '' })}
      />
    );
  }

  return (
    <>
      {state.venues.map((venue) => (
        <section className="card venue-card" key={venue.id}>
          <div className="venue-head">
            <VenueNameInput venueId={venue.id} name={venue.name} />
            <GuestsInput venueId={venue.id} baseGuests={venue.baseGuests} />
            <button
              className={
                confirmingId === venue.id
                  ? 'btn btn-danger-ghost is-confirming'
                  : 'btn btn-danger-ghost'
              }
              type="button"
              onClick={() => {
                if (confirmingId === venue.id) {
                  dispatch({ type: 'removeVenue', venueId: venue.id });
                  setConfirmingId(null);
                } else {
                  setConfirmingId(venue.id);
                }
              }}
            >
              {confirmingId === venue.id ? '本当に削除する？' : '式場を削除'}
            </button>
            {confirmingId === venue.id && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setConfirmingId(null)}
              >
                やめる
              </button>
            )}
          </div>

          {venue.memo && <p className="muted">{venue.memo}</p>}

          <div className="item-list">
            {venueItems(state, venue.id).map((item) => (
              <div className="item-row" key={item.id}>
                <select
                  className="select"
                  aria-label="項目のカテゴリ"
                  value={item.category}
                  onChange={(event) =>
                    dispatch({
                      type: 'updateItem',
                      item: {
                        ...item,
                        category: event.target.value as CategoryId,
                      },
                    })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input item-name"
                  aria-label="項目名"
                  placeholder="項目名"
                  value={item.name}
                  onChange={(event) =>
                    dispatch({
                      type: 'updateItem',
                      item: { ...item, name: event.target.value },
                    })
                  }
                />
                <input
                  className="input item-amount"
                  aria-label="金額"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={item.amount === 0 ? '' : item.amount.toLocaleString('ja-JP')}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/[^0-9]/g, '');
                    dispatch({
                      type: 'updateItem',
                      item: { ...item, amount: digits === '' ? 0 : Number(digits) },
                    });
                  }}
                />
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="削除"
                  onClick={() =>
                    dispatch({ type: 'removeItem', itemId: item.id })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="add-row">
            <select
              className="select"
              aria-label="追加するカテゴリ"
              value={categories[venue.id] ?? 'attire'}
              onChange={(event) =>
                setCategories((previous) => ({
                  ...previous,
                  [venue.id]: event.target.value as CategoryId,
                }))
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() =>
                dispatch({
                  type: 'addItem',
                  venueId: venue.id,
                  category: categories[venue.id] ?? 'attire',
                })
              }
            >
              項目を追加
            </button>
          </div>

          <footer className="venue-total">
            合計 <strong>{yen(venueTotal(state, venue.id))}</strong>
          </footer>
        </section>
      ))}
      <div className="editor-actions">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => dispatch({ type: 'addVenue', name: '' })}
        >
          式場を追加
        </button>
        {onShowComparison && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={onShowComparison}
          >
            比較で並べてみる
          </button>
        )}
      </div>
    </>
  );
}
