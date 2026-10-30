import { useState } from 'react';
import type { CategoryId } from '../types';
import { CATEGORIES } from '../lib/categories';
import { venueItems, venueTotal } from '../lib/calc';
import { yen } from '../lib/format';
import { useAppState } from '../store/appState';

export function EstimateEditor() {
  const { state, dispatch } = useAppState();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, CategoryId>>({});

  return (
    <>
      {state.venues.map((venue) => (
        <section className="card venue-card" key={venue.id}>
          <div className="venue-head">
            <input
              className="input venue-name"
              aria-label="式場名"
              value={venue.name}
              onChange={(event) =>
                dispatch({
                  type: 'renameVenue',
                  venueId: venue.id,
                  name: event.target.value,
                })
              }
            />
            <label>
              想定人数
              <input
                className="input guests-input"
                type="number"
                min={1}
                value={venue.baseGuests}
                onChange={(event) => {
                  const baseGuests = Number.parseInt(event.target.value, 10);
                  if (!Number.isNaN(baseGuests)) {
                    dispatch({
                      type: 'setBaseGuests',
                      venueId: venue.id,
                      baseGuests,
                    });
                  }
                }}
              />
            </label>
            <button
              className="btn btn-danger-ghost"
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
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => dispatch({ type: 'addVenue', name: '' })}
      >
        式場を追加
      </button>
    </>
  );
}
