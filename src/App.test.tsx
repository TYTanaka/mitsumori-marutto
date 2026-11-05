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

  it('式場名を空にして確定しても名前が残る', () => {
    render(<App />);
    const nameInput = screen.getByDisplayValue(
      '青山ガーデンテラス',
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    expect(nameInput.value).toBe('青山ガーデンテラス');
  });
});
