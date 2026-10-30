import { CATEGORY_LABELS } from '../lib/categories';
import { comparisonMatrix, predictTotal } from '../lib/calc';
import { yen } from '../lib/format';
import { useAppState } from '../store/appState';

export function Comparison() {
  const { state } = useAppState();
  const matrix = comparisonMatrix(state);

  if (state.venues.length === 0) {
    return <p>式場がありません。</p>;
  }

  return (
    <>
      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">項目</th>
              {state.venues.map((venue) => (
                <th scope="col" key={venue.id}>
                  {venue.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.category}>
                <th scope="row">{CATEGORY_LABELS[row.category]}</th>
                {state.venues.map((venue) => (
                  <td
                    key={venue.id}
                    className={
                      row.cheapestVenueId === venue.id ? 'cheapest' : undefined
                    }
                  >
                    {yen(row.cells[venue.id])}
                  </td>
                ))}
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
          </tbody>
        </table>
      </div>
      <p className="muted">
        各カテゴリで最も安い式場を色付けしています。予測総額はシミュレーションタブの想定に基づく目安です。
      </p>
    </>
  );
}
