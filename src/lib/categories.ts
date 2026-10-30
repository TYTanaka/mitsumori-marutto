import type { Assumptions, CategoryId, UpliftLevel } from '../types';

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  uplift: Record<Exclude<UpliftLevel, 'none'>, [number, number]>;
}[] = [
  {
    id: 'venue',
    label: '挙式・会場',
    uplift: { standard: [0, 0.05], high: [0.05, 0.10] },
  },
  {
    id: 'attire',
    label: '衣装',
    uplift: { standard: [0.20, 0.40], high: [0.40, 0.80] },
  },
  {
    id: 'food',
    label: '料理・飲料',
    uplift: { standard: [0.05, 0.15], high: [0.15, 0.30] },
  },
  {
    id: 'flowers',
    label: '装花',
    uplift: { standard: [0.15, 0.35], high: [0.35, 0.70] },
  },
  {
    id: 'photo',
    label: '写真・映像',
    uplift: { standard: [0.10, 0.30], high: [0.30, 0.60] },
  },
  {
    id: 'gifts',
    label: '引出物',
    uplift: { standard: [0, 0.10], high: [0.10, 0.25] },
  },
  {
    id: 'paper',
    label: 'ペーパーアイテム',
    uplift: { standard: [0, 0.10], high: [0.10, 0.20] },
  },
  {
    id: 'production',
    label: '演出・その他',
    uplift: { standard: [0.10, 0.25], high: [0.25, 0.50] },
  },
  {
    id: 'other',
    label: 'その他',
    uplift: { standard: [0, 0.10], high: [0.10, 0.20] },
  },
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  venue: '挙式・会場',
  attire: '衣装',
  food: '料理・飲料',
  flowers: '装花',
  photo: '写真・映像',
  gifts: '引出物',
  paper: 'ペーパーアイテム',
  production: '演出・その他',
  other: 'その他',
};

export function defaultAssumptions(): Assumptions {
  return {
    venue: 'standard',
    attire: 'standard',
    food: 'standard',
    flowers: 'standard',
    photo: 'standard',
    gifts: 'standard',
    paper: 'standard',
    production: 'standard',
    other: 'standard',
  };
}

export const PER_HEAD_CATEGORIES: CategoryId[] = ['food', 'gifts', 'paper'];
