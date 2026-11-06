import { useState } from 'react';
import { parseYenInput } from '../lib/parse';
import { yen } from '../lib/format';
import { useAppState } from '../store/appState';

/**
 * Budget cap setting shared by the comparison and simulation tabs.
 * Same draft pattern as the other numeric fields: the raw text is
 * held locally and committed on blur (Enter blurs), with full-width
 * digits normalized. Clearing the field removes the budget.
 */
export function BudgetBar() {
  const { state, dispatch } = useAppState();
  const [draft, setDraft] = useState<string | null>(null);
  const budget = state.budget ?? null;

  const commit = () => {
    if (draft === null) return;

    if (draft.trim() === '') {
      dispatch({ type: 'setBudget', budget: null });
    } else {
      const parsed = parseYenInput(draft);
      if (parsed.ok && parsed.value > 0) {
        dispatch({ type: 'setBudget', budget: parsed.value });
      }
      // Unparseable input discards the draft, reverting to the stored
      // budget instead of storing a wrong figure.
    }
    setDraft(null);
  };

  return (
    <div className="budget-bar">
      <label htmlFor="budget-input">予算の目安</label>
      <input
        id="budget-input"
        className="input budget-input"
        type="text"
        inputMode="numeric"
        placeholder="未設定"
        value={
          draft ??
          (budget !== null ? budget.toLocaleString('ja-JP') : '')
        }
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      <span className="muted">
        {budget !== null
          ? `予算 ${yen(budget)} に対して予測が収まるかを表示します`
          : '設定すると、予測総額が予算に収まるかが分かります'}
      </span>
      {budget !== null && (
        <button
          className="btn btn-ghost budget-clear"
          type="button"
          onClick={() => dispatch({ type: 'setBudget', budget: null })}
        >
          予算を外す
        </button>
      )}
    </div>
  );
}
