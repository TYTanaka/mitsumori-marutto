import type { AppState, Assumptions, CategoryId, LineItem } from '../types';
import { defaultAssumptions } from './categories';

type SeedRow = readonly [CategoryId, string, number];

function makeItems(venueId: string, rows: readonly SeedRow[]): LineItem[] {
  return rows.map(([category, name, amount]) => ({
    id: `${venueId}-${category}`,
    venueId,
    category,
    name,
    amount,
  }));
}

export function createSeedState(): AppState {
  const high: Assumptions = {
    venue: 'high',
    attire: 'high',
    food: 'high',
    flowers: 'high',
    photo: 'high',
    gifts: 'high',
    paper: 'high',
    production: 'high',
    other: 'high',
  };

  return {
    version: 1,
    venues: [
      {
        id: 'va',
        name: '青山ガーデンテラス',
        memo: '初期見積もりは最安。衣装・装花は最低ランク構成。ゲストは10名ほど増える見込み',
        baseGuests: 60,
      },
      {
        id: 'vb',
        name: '横浜ベイサイドホール',
        memo: '標準的な構成の見積もり',
        baseGuests: 60,
      },
      {
        id: 'vc',
        name: '東京クラシックホテル',
        memo: '衣装・装花・映像は上位プラン込み',
        baseGuests: 60,
      },
    ],
    items: [
      ...makeItems('va', [
        ['venue', '挙式・会場使用料', 300000],
        ['attire', '衣装（最低ランク一式）', 250000],
        ['food', '料理・飲料（60名分）', 1020000],
        ['flowers', '装花（最低プラン）', 80000],
        ['photo', '写真・映像（基本プラン）', 80000],
        ['gifts', '引出物（60名分）', 210000],
        ['paper', 'ペーパーアイテム（60名分）', 36000],
        ['production', '演出・設備', 50000],
        ['other', 'サービス料・その他', 30000],
      ]),
      ...makeItems('vb', [
        ['venue', '挙式・会場使用料', 400000],
        ['attire', '衣装（一式）', 300000],
        ['food', '料理・飲料（60名分）', 900000],
        ['flowers', '装花', 150000],
        ['photo', '写真・映像', 150000],
        ['gifts', '引出物（60名分）', 240000],
        ['paper', 'ペーパーアイテム（60名分）', 54000],
        ['production', '演出・設備', 80000],
        ['other', 'サービス料・その他', 40000],
      ]),
      ...makeItems('vc', [
        ['venue', '挙式・会場使用料', 500000],
        ['attire', '衣装（上位プラン一式）', 550000],
        ['food', '料理・飲料（60名分）', 1020000],
        ['flowers', '装花（上位プラン）', 280000],
        ['photo', '写真・映像（上位プラン）', 250000],
        ['gifts', '引出物（60名分）', 270000],
        ['paper', 'ペーパーアイテム（60名分）', 60000],
        ['production', '演出・設備', 120000],
        ['other', 'サービス料・その他', 60000],
      ]),
    ],
    assumptions: {
      va: high,
      vb: defaultAssumptions(),
      vc: {
        ...defaultAssumptions(),
        attire: 'none',
        flowers: 'none',
        photo: 'none',
      },
    },
    guestDelta: { va: 10, vb: 0, vc: 0 },
  };
}
