import { useState } from 'react';
import type { CategoryId, LineItem } from '../types';
import { CATEGORIES, categoryExamples, suggestCategory } from '../lib/categories';
import {
  effectiveItemAmount,
  venueItems,
  venueTotal,
} from '../lib/calc';
import { yen } from '../lib/format';
import { parseCountInput, parseYenInput } from '../lib/parse';
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

    // Full-width digits are normalized before parsing, so 「６０」
    // typed with an IME commits as 60 instead of being discarded.
    const parsed = parseCountInput(draft);
    if (parsed.ok) {
      // The reducer clamps this to the valid range (minimum 1).
      dispatch({ type: 'setBaseGuests', venueId, baseGuests: parsed.value });
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
        type="text"
        inputMode="numeric"
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

/**
 * Amount field for a 合計 (total) line item. Holds a local draft while
 * editing: text that parses (after full-width normalization) commits
 * immediately so totals update live; a leading minus is honoured so
 * discount lines reduce the total. Text that cannot be parsed is kept
 * in the field while typing, and on blur it is rejected with an error
 * message and the field reverts — it never silently becomes ¥0.
 */
function AmountInput({
  item,
  onError,
}: {
  item: LineItem;
  onError: (message: string | null) => void;
}) {
  const { dispatch } = useAppState();
  const [draft, setDraft] = useState<string | null>(null);

  const update = (next: LineItem) => dispatch({ type: 'updateItem', item: next });

  const handleChange = (raw: string) => {
    setDraft(raw);

    if (raw.trim() === '') {
      // Clearing the field returns the row to 未入力.
      update({ ...item, amount: 0, amountSet: false });
      onError(null);
      return;
    }

    const parsed = parseYenInput(raw);
    if (parsed.ok) {
      update({ ...item, amount: parsed.value, amountSet: true });
      onError(null);
    }
    // Unparseable text (e.g. a lone "-") may still be mid-typing:
    // keep the draft and wait for blur before judging it.
  };

  const handleBlur = () => {
    if (draft === null) return;

    if (draft.trim() !== '' && !parseYenInput(draft).ok) {
      onError(
        '金額として読み取れませんでした。数字以外の文字が混ざっていないかご確認ください（全角数字は自動で変換されます）。',
      );
    } else {
      onError(null);
    }
    setDraft(null);
  };

  return (
    <input
      className="input item-amount"
      aria-label="金額"
      type="text"
      inputMode="numeric"
      placeholder={item.amountSet ? '0' : '未入力'}
      value={
        draft ??
        (item.amountSet ? item.amount.toLocaleString('ja-JP') : '')
      }
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * Unit-price field for a 単価×人数 line item. Same draft pattern as
 * AmountInput; committing a unit price stores it together with the
 * derived total (unit price × base guests), and totals keep following
 * the guest count from then on.
 */
function UnitPriceInput({
  item,
  baseGuests,
  onError,
}: {
  item: LineItem;
  baseGuests: number;
  onError: (message: string | null) => void;
}) {
  const { dispatch } = useAppState();
  const [draft, setDraft] = useState<string | null>(null);
  const unitPrice = item.unitPrice ?? 0;

  const handleChange = (raw: string) => {
    setDraft(raw);

    if (raw.trim() === '') {
      dispatch({
        type: 'updateItem',
        item: { ...item, unitPrice: 0, amount: 0, amountSet: false },
      });
      onError(null);
      return;
    }

    const parsed = parseYenInput(raw);
    if (parsed.ok && parsed.value >= 0) {
      dispatch({
        type: 'updateItem',
        item: {
          ...item,
          unitPrice: parsed.value,
          amount: parsed.value * baseGuests,
          amountSet: true,
        },
      });
      onError(null);
    }
  };

  const handleBlur = () => {
    if (draft === null) return;

    const parsed = parseYenInput(draft);
    if (draft.trim() !== '' && (!parsed.ok || parsed.value < 0)) {
      onError(
        '単価として読み取れませんでした。0以上の数字で入力してください（全角数字は自動で変換されます）。',
      );
    } else {
      onError(null);
    }
    setDraft(null);
  };

  return (
    <input
      className="input item-amount"
      aria-label="単価"
      type="text"
      inputMode="numeric"
      placeholder={item.amountSet ? '0' : '未入力'}
      value={
        draft ?? (item.amountSet ? unitPrice.toLocaleString('ja-JP') : '')
      }
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function ItemRow({
  item,
  baseGuests,
}: {
  item: LineItem;
  baseGuests: number;
}) {
  const { state, dispatch } = useAppState();
  const [amountError, setAmountError] = useState<string | null>(null);
  const mode = item.mode ?? 'total';
  const effective = effectiveItemAmount(state, item);
  const suggestion = suggestCategory(item.name);
  const showSuggestion = suggestion !== null && suggestion !== item.category;
  const suggestionLabel = showSuggestion
    ? CATEGORIES.find((category) => category.id === suggestion)?.label
    : null;

  const setMode = (nextMode: 'total' | 'perHead') => {
    if (nextMode === mode) return;

    if (nextMode === 'perHead') {
      const unitPrice =
        baseGuests > 0 ? Math.round(effective / baseGuests) : 0;
      dispatch({
        type: 'updateItem',
        item: {
          ...item,
          mode: 'perHead',
          unitPrice,
          amount: unitPrice * baseGuests,
        },
      });
    } else {
      dispatch({
        type: 'updateItem',
        item: { ...item, mode: 'total', amount: effective },
      });
    }
  };

  return (
    <div
      className={
        effective < 0 ? 'item-row item-row--discount' : 'item-row'
      }
    >
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
      {mode === 'perHead' ? (
        <UnitPriceInput
          item={item}
          baseGuests={baseGuests}
          onError={setAmountError}
        />
      ) : (
        <AmountInput item={item} onError={setAmountError} />
      )}
      <button
        className="icon-btn"
        type="button"
        aria-label="削除"
        onClick={() => dispatch({ type: 'removeItem', itemId: item.id })}
      >
        ×
      </button>

      <div className="item-sub">
        <label className="mode-select">
          入力方法
          <select
            className="select"
            aria-label="金額の入力方法"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as 'total' | 'perHead')
            }
          >
            <option value="total">合計</option>
            <option value="perHead">単価×人数</option>
          </select>
        </label>
        {mode === 'perHead' && (
          <span className="perhead-result">
            単価 × {baseGuests}名 = <strong>{yen(effective)}</strong>
          </span>
        )}
        {effective < 0 && <span className="discount-tag">値引き</span>}
        {mode === 'total' && item.amountSet && item.amount === 0 && (
          <span className="zero-tag">¥0で登録</span>
        )}
      </div>

      {showSuggestion && suggestion !== null && (
        <p className="item-suggest">
          項目名からすると「{suggestionLabel}」かもしれません。
          <button
            type="button"
            className="suggest-btn"
            onClick={() =>
              dispatch({
                type: 'updateItem',
                item: { ...item, category: suggestion },
              })
            }
          >
            {suggestionLabel}に変更する
          </button>
        </p>
      )}

      {amountError && (
        <p className="item-error" role="alert">
          {amountError}
        </p>
      )}
    </div>
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
      {state.venues.map((venue) => {
        const items = venueItems(state, venue.id);
        const unsetCount = items.filter((item) => !item.amountSet).length;
        // The add-row starts from the category of the venue's most
        // recent row — estimates are grouped by category, so the next
        // line usually continues the previous one — falling back to
        // 挙式・会場, where most estimates begin.
        const addCategory =
          categories[venue.id] ??
          items[items.length - 1]?.category ??
          'venue';

        return (
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
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  baseGuests={venue.baseGuests}
                />
              ))}
            </div>

            <div className="add-row">
              <select
                className="select"
                aria-label="追加するカテゴリ"
                value={addCategory}
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
                    category: addCategory,
                  })
                }
              >
                項目を追加
              </button>
              <p className="category-hint">
                例：{categoryExamples(addCategory)}
              </p>
            </div>

            <footer className="venue-total">
              {unsetCount > 0 && (
                <span className="unset-note">
                  金額が未入力の項目が{unsetCount}件あります
                </span>
              )}
              <span>
                合計 <strong>{yen(venueTotal(state, venue.id))}</strong>
              </span>
            </footer>
          </section>
        );
      })}
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
