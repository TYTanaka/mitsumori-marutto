import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

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

    expect(screen.getByText('初期総額')).toBeTruthy();
    expect(screen.getAllByText('¥2,056,000').length).toBeGreaterThan(0);
  });

  it('シミュレーションで順位の入れ替わりを表示する', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('tab', { name: '総額シミュレーション' }),
    );

    expect(screen.getByText(/順位が入れ替わっています/)).toBeTruthy();
  });
});
