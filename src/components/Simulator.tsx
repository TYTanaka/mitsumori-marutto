import type { UpliftLevel } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/categories';
import {
  perHeadCost,
  predictTotal,
  rankingByPredicted,
  rankingFlips,
  uncountedCategories,
  uncountedPerHeadCategories,
} from '../lib/calc';
import { man, signedMan, signedYen, venueDisplayName, yen } from '../lib/format';
import { useAppState } from '../store/appState';
import { EmptyState } from './EmptyState';

export function Simulator({
  onShowEstimate,
}: {
  onShowEstimate?: () => void;
}) {
  const { state, dispatch } = useAppState();
  const flips = rankingFlips(state);
  const predictions = state.venues.map((venue) => ({
    venue,
    prediction: predictTotal(state, venue.id),
  }));
  // Venues with categories missing from their estimate (未計上) are
  // predicted as if those categories cost ¥0, so their totals and any
  // ranking built on them are understated. That caveat has to travel
  // with the numbers on this screen, where the final call is made.
  const uncountedByVenue = new Map(
    state.venues.map((venue) => [
      venue.id,
      uncountedCategories(state, venue.id),
    ]),
  );
  const anyUncounted = [...uncountedByVenue.values()].some(
    (list) => list.length > 0,
  );
  const predictedCheapestId = rankingByPredicted(state)[0];
  const predictedCheapestUncounted =
    predictedCheapestId !== undefined
      ? (uncountedByVenue.get(predictedCheapestId) ?? [])
      : [];
  const maxHigh = Math.max(0, ...predictions.map(({ prediction }) => prediction.high));
  const percent = (value: number) =>
    `${maxHigh > 0 ? (value / maxHigh) * 100 : 0}%`;

  if (state.venues.length === 0) {
    return (
      <EmptyState
        message="まだ式場が登録されていません。見積もりタブで式場を追加すると、ここで総額の予測が見られます。"
        actionLabel="見積もりタブで式場を追加する"
        onAction={onShowEstimate}
      />
    );
  }

  const nameOf = (venueId: string) => {
    const index = state.venues.findIndex((venue) => venue.id === venueId);
    return index >= 0
      ? venueDisplayName(state.venues[index].name, index)
      : '式場';
  };

  return (
    <>
      {flips.length > 0 && (
        <div className="flip-banner" role="alert">
          {'初期見積もりの順位と予測総額の順位が入れ替わっています：' +
            flips
              .map(
                (flip) =>
                  `${nameOf(flip.venueId)}（初期 ${flip.baseRank}位 → 予測 ${flip.predictedRank}位）`,
              )
              .join('、')}
          {anyUncounted &&
            '（未計上カテゴリを含む式場があるため、この順位は暫定です）'}
        </div>
      )}

      {flips.length === 0 && predictedCheapestUncounted.length > 0 && (
        <div className="flip-banner" role="note">
          {`予測総額が最も安い${nameOf(predictedCheapestId)}には${predictedCheapestUncounted.length}カテゴリの未計上があるため、この順位は暫定です。実際の総額はこれより高くなります。`}
        </div>
      )}

      <p className="muted">
        バーの長さは、全式場の中で最も高い予測額（{yen(maxHigh)}）を100%として表示しています。
      </p>

      {predictions.map(({ venue, prediction }, index) => {
        const { base, low, high, mid } = prediction;
        const uncounted = uncountedByVenue.get(venue.id) ?? [];
        const uncountedPerHead = uncountedPerHeadCategories(state, venue.id);
        const delta = state.guestDelta[venue.id] ?? 0;

        return (
          <section className="card sim-card" key={venue.id}>
            <h2 className="sim-venue-name">
              {venueDisplayName(venue.name, index)}
            </h2>
            {uncounted.length > 0 && (
              <p className="uncounted-warning">
                {uncounted.length}カテゴリ未計上（
                {uncounted
                  .map((category) => CATEGORY_LABELS[category])
                  .join('・')}
                ）— 実際の総額はこれより高くなります
              </p>
            )}
            <div className="bars">
              <div className="bar-row">
                <span className="bar-label">初期総額</span>
                <div className="bar-track" aria-hidden="true">
                  <i className="bar base" style={{ width: percent(base) }} />
                </div>
                <span className="bar-value">{yen(base)}</span>
              </div>
              <div className="bar-row">
                <span className="bar-label">予測レンジ</span>
                <div className="bar-track" aria-hidden="true">
                  <i
                    className="bar range"
                    style={{
                      marginLeft: percent(low),
                      width: percent(high - low),
                    }}
                  />
                  <b className="bar-mid" style={{ left: percent(mid) }} />
                </div>
                <span className="bar-value">
                  {yen(low)} 〜 {yen(high)}
                </span>
              </div>
            </div>

            {/* Amount rule for this screen: the main figure is always
                the full yen amount; rounded 万円 figures appear only
                as a parenthesised aid, never as a second main figure. */}
            <p className="sim-summary">
              予測中央値{' '}
              <strong className="mid-figure">{yen(mid)}</strong>（{man(mid)}）
              {' '}／ 初期から {signedYen(mid - base)}（{signedMan(mid - base)}）
            </p>

            <div className="assumption-grid">
              {CATEGORIES.map((category) => (
                <label key={category.id}>
                  <span>{category.label}</span>
                  <select
                    className="select"
                    value={
                      state.assumptions[venue.id]?.[category.id] ?? 'standard'
                    }
                    onChange={(event) =>
                      dispatch({
                        type: 'setAssumption',
                        venueId: venue.id,
                        category: category.id,
                        level: event.target.value as UpliftLevel,
                      })
                    }
                  >
                    <option value="none">そのまま</option>
                    <option value="standard">標準</option>
                    <option value="high">高め</option>
                  </select>
                </label>
              ))}
            </div>

            <div className="delta-row">
              <label htmlFor={`delta-${venue.id}`}>ゲスト人数の増減</label>
              <input
                id={`delta-${venue.id}`}
                className="input delta-input"
                type="number"
                min={-30}
                max={50}
                value={state.guestDelta[venue.id] ?? 0}
                onChange={(event) =>
                  dispatch({
                    type: 'setGuestDelta',
                    venueId: venue.id,
                    delta: Number(event.target.value) || 0,
                  })
                }
              />
              <span className="muted">
                {venue.baseGuests >= 1 ? (
                  <>1人あたり {yen(perHeadCost(state, venue.id))} で換算</>
                ) : (
                  <>想定人数を入力すると、1人あたりの金額で換算します</>
                )}
              </span>
              {delta !== 0 && uncountedPerHead.length > 0 && (
                <p className="uncounted-warning delta-warning">
                  人数に連動する未計上カテゴリ（
                  {uncountedPerHead
                    .map((category) => CATEGORY_LABELS[category])
                    .join('・')}
                  ）があるため、
                  {delta > 0 ? '増額' : '減額'}
                  は実際より小さく表示されています
                </p>
              )}
            </div>
          </section>
        );
      })}

      <p className="muted">
        上がり幅は一般的な目安です。実際の金額は式場・プランにより異なります。
      </p>

      {onShowEstimate && (
        <div className="next-step">
          <button
            className="btn btn-primary"
            type="button"
            onClick={onShowEstimate}
          >
            見積もりタブで内容を調整する
          </button>
        </div>
      )}
    </>
  );
}
