import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { defaultAssumptions } from './categories';
import { generateQuestions, questionsToText } from './questions';

function fixture(): AppState {
  return {
    version: 1,
    venues: [{ id: 'v1', name: 'Venue 1', memo: '', baseGuests: 60 }],
    items: [
      { id: 'i1', venueId: 'v1', category: 'venue', name: '会場', amount: 200_000 },
      { id: 'i2', venueId: 'v1', category: 'attire', name: '衣装', amount: 500_000 },
      { id: 'i3', venueId: 'v1', category: 'food', name: '料理', amount: 600_000 },
      { id: 'i4', venueId: 'v1', category: 'flowers', name: '装花', amount: 100_000 },
      { id: 'i5', venueId: 'v1', category: 'photo', name: '写真', amount: 100_000 },
      { id: 'i6', venueId: 'v1', category: 'gifts', name: '引出物', amount: 120_000 },
      { id: 'i7', venueId: 'v1', category: 'paper', name: 'ペーパー', amount: 30_000 },
      { id: 'i8', venueId: 'v1', category: 'production', name: '演出', amount: 50_000 },
      { id: 'i9', venueId: 'v1', category: 'other', name: 'その他', amount: 30_000 },
    ],
    assumptions: { v1: defaultAssumptions() },
    guestDelta: {},
  };
}

describe('venue question generation', () => {
  it('asks about high-uplift categories even when they are counted', () => {
    const questions = generateQuestions(fixture(), 'v1');

    // Standard-uplift ceilings: attire .40, flowers .35, photo .30,
    // production .25 reach the threshold; the rest do not.
    expect(questions.map((entry) => entry.category)).toEqual([
      'attire',
      'flowers',
      'photo',
      'production',
    ]);
    expect(questions.every((entry) => !entry.missing)).toBe(true);
  });

  it('asks about every missing category, marked as missing', () => {
    const state = fixture();
    state.items = state.items.filter(
      (item) => item.category !== 'flowers' && item.category !== 'gifts',
    );

    const questions = generateQuestions(state, 'v1');
    const flowers = questions.find((entry) => entry.category === 'flowers');
    const gifts = questions.find((entry) => entry.category === 'gifts');

    expect(flowers?.missing).toBe(true);
    expect(gifts?.missing).toBe(true);
    expect(flowers?.question).toContain('含まれていません');
  });

  it('includes low-uplift categories the user marked as high', () => {
    const state = fixture();
    state.assumptions.v1 = { ...defaultAssumptions(), food: 'high' };

    const questions = generateQuestions(state, 'v1');

    expect(
      questions.some(
        (entry) => entry.category === 'food' && !entry.missing,
      ),
    ).toBe(true);
  });

  it('renders a numbered plain-text list for copying', () => {
    const questions = generateQuestions(fixture(), 'v1');
    const text = questionsToText('青山ガーデンテラス', questions);

    expect(text).toContain('青山ガーデンテラス への確認事項');
    expect(text).toContain('1. ');
    expect(text.split('\n')).toHaveLength(questions.length + 1);
  });
});
