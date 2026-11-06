import { useState } from 'react';
import type { UpliftLevel } from '../types';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  upliftRangeText,
} from '../lib/categories';
import {
  budgetStatus,
  isVenueUnentered,
  perHeadCost,
  predictTotal,
  rankingByPredicted,
  rankingFlips,
  uncountedCategories,
  uncountedPerHeadCategories,
} from '../lib/calc';
import { man, signedMan, signedYen, venueDisplayName, yen } from '../lib/format';
import {
  MAX_GUEST_DELTA,
  MIN_GUEST_DELTA,
} from '../lib/guests';
import { parseCountInput } from '../lib/parse';
import { generateQuestions, questionsToText } from '../lib/questions';
import { useAppState } from '../store/appState';
import { BudgetBar } from './BudgetBar';
import { EmptyState } from './EmptyState';

/**
 * Guest-delta field with the standard draft pattern: raw text is held
 * locally and committed on blur (Enter blurs). Full-width digits are
 * normalized, and the store clamps the value to
 * [MIN_GUEST_DELTA, MAX_GUEST_DELTA], so the field always settles on
 * a value inside the promised range.
 */
function DeltaInput({
  venueId,
  delta,
}: {
  venueId: string;
  delta: number;
}) {
  const { dispatch } = useAppState();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    const parsed = parseCountInput(draft);
    if (parsed.ok) {
      dispatch({ type: 'setGuestDelta', venueId, delta: parsed.value });
    }
    setDraft(null);
  };

  return (
    <input
      id={`delta-${venueId}`}
      className="input delta-input"
      type="text"
      inputMode="numeric"
      aria-describedby={`delta-range-${venueId}`}
      value={draft ?? String(delta)}
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

export function Simulator({
  onShowEstimate,
}: {
  onShowEstimate?: () => void;
}) {
  const { state, dispatch } = useAppState();
  const [copiedVenueId, setCopiedVenueId] = useState<string | null>(null);
  const budget = state.budget ?? null;
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

  const copyQuestions = async (venueId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVenueId(venueId);
    } catch {
      // Clipboard unavailable (permissions, insecure context): leave
      // the list on screen so it can still be copied by hand.
      setCopiedVenueId(null);
    }
  };

  return (
    <>
      <BudgetBar />

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
        const unentered = isVenueUnentered(state, venue.id);
        const questions = generateQuestions(state, venue.id);
        const status = budget !== null ? budgetStatus(prediction, budget) : null;

        return (
          <section className="card sim-card" key={venue.id}>
            <h2 className="sim-venue-name">
              {venueDisplayName(venue.name, index)}
            </h2>
            {unentered && (
              <p className="uncounted-warning">
                まだ項目が入力されていません（未入力）。この式場は順位に含まれていません。
              </p>
            )}
            {!unentered && uncounted.length > 0 && (
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
              {status !== null && (
                <span className={`budget-chip budget-chip--${status}`}>
                  {status === 'within'
                    ? '予算内'
                    : status === 'over'
                      ? '予算超過'
                      : '一部が予算を超える可能性'}
                </span>
              )}
            </p>

            <div className="assumption-grid">
              {CATEGORIES.map((category) => {
                const level =
                  state.assumptions[venue.id]?.[category.id] ?? 'standard';

                return (
                  <label key={category.id}>
                    <span>{category.label}</span>
                    <select
                      className="select"
                      value={level}
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
                    <span className="assumption-rate">
                      {upliftRangeText(category.id, level)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="delta-row">
              <label htmlFor={`delta-${venue.id}`}>ゲスト人数の増減</label>
              <DeltaInput venueId={venue.id} delta={delta} />
              <span className="muted" id={`delta-range-${venue.id}`}>
                （{MIN_GUEST_DELTA}〜+{MAX_GUEST_DELTA}名まで）
              </span>
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

            {questions.length > 0 && (
              <div className="questions">
                <h3 className="questions-title">
                  式場への確認質問リスト
                </h3>
                <p className="muted">
                  未計上のカテゴリと、金額が上がりやすいカテゴリから自動で作りました。次の見学・打ち合わせで確認してみてください。
                </p>
                <ol className="questions-list">
                  {questions.map((entry) => (
                    <li key={entry.category}>
                      <span className="questions-category">
                        {CATEGORY_LABELS[entry.category]}
                        {entry.missing ? '（未計上）' : ''}
                      </span>
                      {entry.question}
                    </li>
                  ))}
                </ol>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() =>
                    copyQuestions(
                      venue.id,
                      questionsToText(
                        venueDisplayName(venue.name, index),
                        questions,
                      ),
                    )
                  }
                >
                  {copiedVenueId === venue.id
                    ? 'コピーしました'
                    : '質問リストをコピーする'}
                </button>
              </div>
            )}
          </section>
        );
      })}

      <section className="card premise-card">
        <h2 className="premise-title">予測の前提（カテゴリ別の上振れ率）</h2>
        <p className="muted">
          上振れ率は、初期見積もりが最低ランクの構成で作られがちなカテゴリほど、打ち合わせを重ねるうちに金額が上がりやすいという一般的な目安をもとにした幅です。式場・プランによる差が大きいため、断定ではなく幅（レンジ）で示しています。気になるカテゴリは想定を「高め」に変えて、総額がどう動くか確認してください。
        </p>
        <div className="premise-scroll">
          <table className="premise-table">
            <thead>
              <tr>
                <th scope="col">カテゴリ</th>
                <th scope="col">そのまま</th>
                <th scope="col">標準</th>
                <th scope="col">高め</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => (
                <tr key={category.id}>
                  <th scope="row">{category.label}</th>
                  <td>{upliftRangeText(category.id, 'none')}</td>
                  <td>{upliftRangeText(category.id, 'standard')}</td>
                  <td>{upliftRangeText(category.id, 'high')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
