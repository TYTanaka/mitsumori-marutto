import { useState } from 'react';
import { CATEGORY_LABELS } from '../lib/categories';
import {
  comparisonMatrix,
  isVenueUnentered,
  predictTotal,
  uncountedCategories,
} from '../lib/calc';
import { signedYen, venueDisplayName, yen } from '../lib/format';
import { useAppState } from '../store/appState';
import { BudgetBar } from './BudgetBar';
import { EmptyState } from './EmptyState';

export function Comparison({
  onShowEstimate,
  onShowSimulation,
}: {
  onShowEstimate?: () => void;
  onShowSimulation?: () => void;
}) {
  const { state } = useAppState();
  const matrix = comparisonMatrix(state);
  const budget = state.budget ?? null;
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  if (state.venues.length === 0) {
    return (
      <EmptyState
        message="まだ式場が登録されていません。見積もりタブで式場を追加すると、ここで横並びに比べられます。"
        actionLabel="見積もりタブで式場を追加する"
        onAction={onShowEstimate}
      />
    );
  }

  const selectedVenue =
    state.venues.find((venue) => venue.id === selectedVenueId) ??
    state.venues[0];
  const selectedIndex = state.venues.indexOf(selectedVenue);
  // A venue whose estimate is incomplete must not read as plainly
  // "cheapest": its missing categories are summed as ¥0, so the badge
  // is qualified and the gap is named next to the venue itself.
  const uncountedByVenue = new Map(
    state.venues.map((venue) => [
      venue.id,
      uncountedCategories(state, venue.id),
    ]),
  );
  const selectedUncounted = uncountedByVenue.get(selectedVenue.id) ?? [];
  const selectedUnentered = isVenueUnentered(state, selectedVenue.id);

  const cellContent = (amount: number | null | undefined) =>
    amount === null || amount === undefined ? (
      <span className="not-counted">—（未計上）</span>
    ) : (
      yen(amount)
    );

  return (
    <>
      <BudgetBar />

      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">項目</th>
              {state.venues.map((venue, index) => (
                <th scope="col" key={venue.id}>
                  {venueDisplayName(venue.name, index)}
                  {isVenueUnentered(state, venue.id) ? (
                    <span className="venue-uncounted">未入力</span>
                  ) : (
                    (uncountedByVenue.get(venue.id)?.length ?? 0) > 0 && (
                      <span className="venue-uncounted">
                        {uncountedByVenue.get(venue.id)!.length}
                        カテゴリ未計上
                      </span>
                    )
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.category}>
                <th scope="row">{CATEGORY_LABELS[row.category]}</th>
                {state.venues.map((venue) => {
                  const amount = row.cells[venue.id];

                  return (
                    <td
                      key={venue.id}
                      className={
                        row.cheapestVenueId === venue.id
                          ? 'cheapest'
                          : undefined
                      }
                    >
                      {cellContent(amount)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="total-row">
              <th scope="row">初期総額</th>
              {state.venues.map((venue) => (
                <td key={venue.id}>{yen(matrix.totals[venue.id])}</td>
              ))}
            </tr>
            <tr className="predict-row">
              <th scope="row">予測総額（中央値）</th>
              {state.venues.map((venue) => (
                <td key={venue.id}>
                  {yen(predictTotal(state, venue.id).mid)}
                </td>
              ))}
            </tr>
            {budget !== null && (
              <tr className="budget-row">
                <th scope="row">予算との差（中央値）</th>
                {state.venues.map((venue) => {
                  const diff = predictTotal(state, venue.id).mid - budget;

                  return (
                    <td
                      key={venue.id}
                      className={diff > 0 ? 'over-budget' : undefined}
                    >
                      {diff > 0
                        ? `${signedYen(diff)}（予算超過）`
                        : `${signedYen(diff)}（予算内）`}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Narrow screens (<=640px): one venue at a time as a vertical
          list, per the SPEC fallback, instead of a wide table that
          scrolls its row labels away. Toggled purely by CSS. */}
      <div className="compare-mobile">
        <div className="venue-switch" role="group" aria-label="表示する式場">
          {state.venues.map((venue, index) => (
            <button
              key={venue.id}
              type="button"
              className="venue-switch-btn"
              aria-pressed={venue.id === selectedVenue.id}
              onClick={() => setSelectedVenueId(venue.id)}
            >
              {venueDisplayName(venue.name, index)}
            </button>
          ))}
        </div>
        {selectedUnentered ? (
          <p className="uncounted-warning">
            この式場はまだ項目が入力されていません（未入力）。金額はすべて未計上です。
          </p>
        ) : (
          selectedUncounted.length > 0 && (
            <p className="uncounted-warning">
              この式場は{selectedUncounted.length}
              カテゴリが未計上です。初期総額・予測総額は実際より低く表示されます。
            </p>
          )
        )}
        <div className="compare-list">
          {matrix.rows.map((row) => (
            <div className="compare-list-row" key={row.category}>
              <span className="compare-list-label">
                {CATEGORY_LABELS[row.category]}
                {row.cheapestVenueId === selectedVenue.id && (
                  <span className="cheapest-tag">
                    {selectedUncounted.length > 0
                      ? '最安（計上分のみ）'
                      : '最安'}
                  </span>
                )}
              </span>
              <span className="compare-list-value">
                {cellContent(row.cells[selectedVenue.id])}
              </span>
            </div>
          ))}
          <div className="compare-list-row total">
            <span className="compare-list-label">初期総額</span>
            <span className="compare-list-value">
              {yen(matrix.totals[selectedVenue.id])}
            </span>
          </div>
          <div className="compare-list-row predict">
            <span className="compare-list-label">予測総額（中央値）</span>
            <span className="compare-list-value">
              {yen(predictTotal(state, selectedVenue.id).mid)}
            </span>
          </div>
          {budget !== null && (
            <div className="compare-list-row budget">
              <span className="compare-list-label">予算との差（中央値）</span>
              <span className="compare-list-value">
                {(() => {
                  const diff =
                    predictTotal(state, selectedVenue.id).mid - budget;
                  return diff > 0
                    ? `${signedYen(diff)}（予算超過）`
                    : `${signedYen(diff)}（予算内）`;
                })()}
              </span>
            </div>
          )}
        </div>
        <p className="muted compare-mobile-name">
          表示中：{venueDisplayName(selectedVenue.name, selectedIndex)}
        </p>
      </div>

      <p className="muted">
        「—（未計上）」は、その式場の見積もりにそのカテゴリの項目が1件も含まれていないことを示します。初期総額は未計上カテゴリを0円として合算しているため、項目が揃っていない式場の総額は実際にかかる金額より低く見えることがあります。各カテゴリで最も安い式場を色付けしています。予測総額はシミュレーションタブの想定に基づく目安です。
      </p>

      {onShowSimulation && (
        <div className="next-step">
          <button
            className="btn btn-primary"
            type="button"
            onClick={onShowSimulation}
          >
            総額シミュレーションで予測する
          </button>
        </div>
      )}
    </>
  );
}
