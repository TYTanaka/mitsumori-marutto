import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { createSeedState } from './lib/seed';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('見積もりアプリ', () => {
  it('サンプルの式場を表示する', () => {
    render(<App />);

    expect(screen.getByDisplayValue('青山ガーデンテラス')).toBeTruthy();
    expect(screen.getByDisplayValue('横浜ベイサイドホール')).toBeTruthy();
    expect(screen.getByDisplayValue('東京クラシックホテル')).toBeTruthy();
  });

  it('比較タブで初期総額を表示する', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));

    // "初期総額" appears in both the wide table and the narrow-screen
    // vertical list (CSS switches which one is visible).
    expect(screen.getAllByText('初期総額').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥2,056,000').length).toBeGreaterThan(0);
  });

  it('比較タブで未計上カテゴリを ¥0 ではなく「—（未計上）」と表示する', () => {
    const state = createSeedState();
    state.items = state.items.filter(
      (item) => !(item.venueId === 'vc' && item.category === 'other'),
    );
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));

    expect(screen.getByText('—（未計上）')).toBeTruthy();
    expect(
      screen.getByText(/未計上カテゴリを0円として合算/),
    ).toBeTruthy();
  });

  it('人数入力は空にでき、確定時に有効値へ戻り、0は1にクランプされる', () => {
    render(<App />);
    const guestsInput = screen.getAllByDisplayValue('60')[0] as HTMLInputElement;

    // While editing the field can be emptied (previously impossible).
    fireEvent.change(guestsInput, { target: { value: '' } });
    expect(guestsInput.value).toBe('');

    // Blurring with an empty value restores the last valid value.
    fireEvent.blur(guestsInput);
    expect(guestsInput.value).toBe('60');

    // 0 commits as the minimum of 1, never as an invalid headcount.
    fireEvent.change(guestsInput, { target: { value: '0' } });
    fireEvent.blur(guestsInput);
    expect(guestsInput.value).toBe('1');
  });

  it('シミュレーションで「1人あたり¥0」の誤表示を出さない', () => {
    const state = createSeedState();
    state.venues = state.venues.map((venue) => ({
      ...venue,
      baseGuests: 0,
    }));
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    // Invalid persisted headcounts are normalized on load, so the
    // per-head conversion note is computed from a valid count.
    expect(screen.queryByText(/1人あたり ¥0/)).toBeNull();
    expect(screen.getAllByText(/1人あたり/).length).toBeGreaterThan(0);
  });

  it('シミュレーションで順位の入れ替わりを表示する', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(screen.getByText(/順位が入れ替わっています/)).toBeTruthy();
  });

  it('式場0件では3タブとも共通の空状態を表示する', () => {
    const state = createSeedState();
    state.venues = [];
    state.items = [];
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);

    // Estimate tab: explanation plus an add action.
    expect(screen.getByText(/まだ式場が登録されていません/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '式場を追加する' }),
    ).toBeTruthy();

    // Compare tab: same empty state, action leads back to estimate.
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));
    expect(screen.getByText(/横並びに比べられます/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: '見積もりタブで式場を追加する' }),
    );
    expect(screen.getByText(/見積もりの入力を始められます/)).toBeTruthy();

    // Simulate tab: same empty state again.
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );
    expect(screen.getByText(/総額の予測が見られます/)).toBeTruthy();
  });

  it('各タブ末尾のCTAで次のタブへ遷移できる', () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole('button', { name: '比較で並べてみる' }),
    );
    expect(screen.getAllByText('初期総額').length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole('button', {
        name: '総額シミュレーションで予測する',
      }),
    );
    expect(screen.getAllByText(/予測中央値/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole('button', { name: '見積もりタブで内容を調整する' }),
    );
    expect(screen.getByDisplayValue('青山ガーデンテラス')).toBeTruthy();
  });

  it('見積もりタブ以外ではヒーローが1行に畳まれる', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', {
        name: '最初の見積もりだけで、選んでいませんか。',
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '比較' }));
    expect(
      screen.queryByRole('heading', {
        name: '最初の見積もりだけで、選んでいませんか。',
      }),
    ).toBeNull();
    expect(
      screen.getByText('項目を揃えて、式場を横並びで比べます。'),
    ).toBeTruthy();
  });

  it('比較の縦リストで式場を切り替えて表示できる', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));

    fireEvent.click(
      screen.getByRole('button', { name: '横浜ベイサイドホール' }),
    );
    expect(screen.getByText('表示中：横浜ベイサイドホール')).toBeTruthy();
  });

  it('シミュレーションの主表示はフル桁で、万円は補助併記にする', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    // Venue A's predicted median as the main figure, full digits.
    expect(screen.getByText('¥2,812,400')).toBeTruthy();
    // Rounded 万円 figures and the yen difference ride along as aids.
    expect(document.body.textContent).toContain('（約281万円）');
    expect(document.body.textContent).toContain('+¥756,400');
  });

  it('保存に失敗したらバナーで知らせる', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    render(<App />);

    expect(
      screen.getByText(/データを保存できませんでした/),
    ).toBeTruthy();
    spy.mockRestore();
  });

  it('どのタブにも h1 がちょうど1つある', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '最初の見積もりだけで、選んでいませんか。',
      }),
    ).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: '比較' }));
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '項目を揃えて、式場を横並びで比べます。',
      }),
    ).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);

    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '「上がりやすい分」まで含めた、総額の目安です。',
      }),
    ).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('シミュレーションで未計上カテゴリのある式場に警告を引き継ぐ', () => {
    const state = createSeedState();
    state.items = state.items.filter(
      (item) =>
        !(
          item.venueId === 'vc' &&
          (item.category === 'photo' || item.category === 'other')
        ),
    );
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    // Only the incomplete venue's card carries the warning.
    expect(
      screen.getAllByText(/カテゴリ未計上（/).length,
    ).toBe(1);
    expect(
      screen.getByText(
        /2カテゴリ未計上（写真・映像・その他）— 実際の総額はこれより高くなります/,
      ),
    ).toBeTruthy();
  });

  it('順位バナーに未計上を含む旨の但し書きが付く', () => {
    const state = createSeedState();
    // vc keeps only its venue fee, so it is predicted cheapest while
    // eight categories are uncounted.
    state.items = state.items.filter(
      (item) => item.venueId !== 'vc' || item.category === 'venue',
    );
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(
      screen.getByText(/未計上カテゴリを含む式場があるため、この順位は暫定です/),
    ).toBeTruthy();
  });

  it('入れ替わりが無くても、未計上の式場が予測最安なら暫定と知らせる', () => {
    const state = createSeedState();
    state.venues = state.venues.filter((venue) => venue.id === 'vc');
    state.items = state.items.filter(
      (item) =>
        item.venueId === 'vc' &&
        (item.category === 'venue' || item.category === 'food'),
    );
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(
      screen.getByText(
        /予測総額が最も安い東京クラシックホテルには7カテゴリの未計上があるため、この順位は暫定です/,
      ),
    ).toBeTruthy();
  });

  it('人数を増やすと、人数連動の未計上がある式場では増額が過小だと知らせる', () => {
    const state = createSeedState();
    state.items = state.items.filter(
      (item) =>
        !(
          item.venueId === 'vc' &&
          (item.category === 'gifts' || item.category === 'paper')
        ),
    );
    state.guestDelta = { ...state.guestDelta, vc: 10 };
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(
      screen.getByText(
        /人数に連動する未計上カテゴリ（引出物・ペーパーアイテム）があるため、増額は実際より小さく表示されています/,
      ),
    ).toBeTruthy();
  });

  it('比較の最安タグは、未計上のある式場では「計上分のみ」と限定する', () => {
    const state = createSeedState();
    state.items = state.items.filter(
      (item) =>
        !(
          item.venueId === 'va' &&
          (item.category === 'flowers' || item.category === 'photo')
        ),
    );
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));

    // The mobile list defaults to the first venue (va), which is
    // cheapest in several categories but incomplete overall, so every
    // one of its tags is qualified.
    expect(
      screen.getAllByText('最安（計上分のみ）').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('最安')).toBeNull();
    expect(
      screen.getByText(/この式場は2カテゴリが未計上です/),
    ).toBeTruthy();
    // Wide table: the venue's column head names the gap too.
    expect(screen.getByText('2カテゴリ未計上')).toBeTruthy();
  });

  it('比較の最安タグは、項目が揃った式場ではそのまま「最安」と出す', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));

    expect(screen.getAllByText('最安').length).toBeGreaterThan(0);
    expect(screen.queryByText('最安（計上分のみ）')).toBeNull();
  });

  it('式場名を空にして確定しても名前が残る', () => {
    render(<App />);
    const nameInput = screen.getByDisplayValue(
      '青山ガーデンテラス',
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    expect(nameInput.value).toBe('青山ガーデンテラス');
  });

  it('値引きをマイナスで入力すると合計が減る', () => {
    render(<App />);
    // 青山's venue fee, ¥300,000 — the first venue's first row.
    // 青山's venue fee (横浜's attire is also ¥300,000, so take the
    // first match in DOM order, which is the first venue's first row).
    const amountInput = screen.getAllByDisplayValue(
      '300,000',
    )[0] as HTMLInputElement;
    expect(screen.getByText('¥2,056,000')).toBeTruthy();

    fireEvent.change(amountInput, { target: { value: '-300000' } });

    // +300,000 → -300,000, so the venue total drops by 600,000.
    expect(screen.getByText('¥1,456,000')).toBeTruthy();
    expect(screen.getByText('値引き')).toBeTruthy();
  });

  it('金額欄の全角数字は半角に変換されて取り込まれる', () => {
    render(<App />);
    // 青山's venue fee (横浜's attire is also ¥300,000, so take the
    // first match in DOM order, which is the first venue's first row).
    const amountInput = screen.getAllByDisplayValue(
      '300,000',
    )[0] as HTMLInputElement;

    fireEvent.change(amountInput, { target: { value: '５０００' } });

    // 2,056,000 - 300,000 + 5,000: never silently ¥0.
    expect(screen.getByText('¥1,761,000')).toBeTruthy();
  });

  it('金額として読み取れない入力はエラー表示され、値は戻る', () => {
    render(<App />);
    // 青山's venue fee (横浜's attire is also ¥300,000, so take the
    // first match in DOM order, which is the first venue's first row).
    const amountInput = screen.getAllByDisplayValue(
      '300,000',
    )[0] as HTMLInputElement;

    fireEvent.change(amountInput, { target: { value: 'abc123' } });
    fireEvent.blur(amountInput);

    expect(
      screen.getByText(/金額として読み取れませんでした/),
    ).toBeTruthy();
    // The stored amount is untouched, so the total stands and the
    // field falls back to the formatted stored value.
    expect(screen.getByText('¥2,056,000')).toBeTruthy();
    expect(amountInput.value).toBe('300,000');
  });

  it('単価×人数モードでは想定人数の変更に金額が追随する', () => {
    render(<App />);
    const modeSelect = screen.getAllByLabelText(
      '金額の入力方法',
    )[0] as HTMLSelectElement;

    fireEvent.change(modeSelect, { target: { value: 'perHead' } });
    // 300,000 ÷ 60名 = 単価5,000円, so the derived total is unchanged.
    expect(document.body.textContent).toContain('単価 × 60名');
    expect(screen.getByText('¥2,056,000')).toBeTruthy();

    const guestsInput = screen.getAllByDisplayValue(
      '60',
    )[0] as HTMLInputElement;
    fireEvent.change(guestsInput, { target: { value: '80' } });
    fireEvent.blur(guestsInput);

    // 5,000 × 80名 = 400,000: the venue total rises by 100,000.
    expect(document.body.textContent).toContain('単価 × 80名');
    expect(screen.getByText('¥2,156,000')).toBeTruthy();
  });

  it('シミュレーションに上振れ率の前提と確認質問リストを表示する', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    // The premise behind the prediction is on screen (M1): the rate
    // table plus the per-category ranges next to each assumption.
    expect(screen.getByText(/予測の前提（カテゴリ別の上振れ率）/)).toBeTruthy();
    expect(screen.getAllByText('+40〜80%').length).toBeGreaterThan(0);

    // Questions are generated for the venue (all assumptions 'high'
    // for 青山 in the seed).
    expect(
      screen.getAllByText('式場への確認質問リスト').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: '質問リストをコピーする' })
        .length,
    ).toBeGreaterThan(0);
  });

  it('予算を設定すると式場ごとの予算内・超過が分かる', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    const budgetInput = screen.getByLabelText(
      '予算の目安',
    ) as HTMLInputElement;
    fireEvent.change(budgetInput, { target: { value: '2500000' } });
    fireEvent.blur(budgetInput);

    // 青山's predicted range sits entirely above ¥2,500,000, while
    // 横浜's range straddles it.
    expect(screen.getAllByText('予算超過').length).toBeGreaterThan(0);
    expect(screen.getByText('一部が予算を超える可能性')).toBeTruthy();

    // The comparison tab carries the same budget as a diff row.
    fireEvent.click(screen.getByRole('tab', { name: '比較' }));
    expect(screen.getAllByText('予算との差（中央値）').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/（予算超過）/).length).toBeGreaterThan(0);
  });

  it('項目が未入力の式場は順位に入らず「未入力」と区別される', () => {
    const state = createSeedState();
    state.venues.push({
      id: 'vz',
      name: '未入力ホール',
      memo: '',
      baseGuests: 60,
    });
    state.assumptions.vz = { ...state.assumptions.va };
    localStorage.setItem('mitsumori-state-v1', JSON.stringify(state));

    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(
      screen.getByText(/まだ項目が入力されていません（未入力）/),
    ).toBeTruthy();
    // The ¥0 placeholder venue must not be named the predicted
    // cheapest nor flip other venues' ranks.
    expect(screen.queryByText(/未入力ホールには/)).toBeNull();
  });

  it('壊れたJSONの読み込みは理由を表示して現在のデータを守る', async () => {
    render(<App />);

    const fileInput = screen.getByLabelText(
      'JSONファイルを選択',
    ) as HTMLInputElement;
    const broken = new File(['{not json'], 'broken.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [broken] } });

    expect(
      await screen.findByText(/データを読み込めませんでした/),
    ).toBeTruthy();
    expect(screen.getByDisplayValue('青山ガーデンテラス')).toBeTruthy();
  });

  it('共有リンクとJSON書き出しの導線がある', () => {
    render(<App />);

    expect(
      screen.getByRole('button', { name: '共有リンクをコピー' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'JSONを書き出す' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'JSONを読み込む' }),
    ).toBeTruthy();
  });

  it('自動コピーできない環境では共有リンク自体を表示する', async () => {
    render(<App />);

    // jsdom has no Clipboard API, so the copy attempt falls back to
    // presenting the link for manual copying.
    fireEvent.click(
      screen.getByRole('button', { name: '共有リンクをコピー' }),
    );

    const fallback = (await screen.findByLabelText(
      '共有リンク',
    )) as HTMLInputElement;
    expect(fallback.value).toContain('#d=');
    expect(
      screen.getByText(/自動でコピーできませんでした/),
    ).toBeTruthy();
  });
});
