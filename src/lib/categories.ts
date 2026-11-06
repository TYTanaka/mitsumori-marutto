import type { Assumptions, CategoryId, UpliftLevel } from '../types';

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  /** Typical line items on a venue's estimate that belong here. */
  examples: string;
  uplift: Record<Exclude<UpliftLevel, 'none'>, [number, number]>;
}[] = [
  {
    id: 'venue',
    label: '挙式・会場',
    examples: '挙式料、セレモニー費、チャペル・神殿使用料、会場使用料、控室料',
    uplift: { standard: [0, 0.05], high: [0.05, 0.10] },
  },
  {
    id: 'attire',
    label: '衣装',
    examples: '衣装レンタル、新郎衣装、衣装持ち込み料、小物一式',
    uplift: { standard: [0.20, 0.40], high: [0.40, 0.80] },
  },
  {
    id: 'food',
    label: '料理・飲料',
    examples: 'コース料理、ドリンク、ウェディングケーキ',
    uplift: { standard: [0.05, 0.15], high: [0.15, 0.30] },
  },
  {
    id: 'flowers',
    label: '装花',
    examples: 'メインテーブル装花、ゲストテーブル装花、ブーケ、フラワーシャワー',
    uplift: { standard: [0.15, 0.35], high: [0.35, 0.70] },
  },
  {
    id: 'photo',
    label: '写真・映像',
    examples: 'スナップ写真、ビデオ撮影、アルバム、エンドロール',
    uplift: { standard: [0.10, 0.30], high: [0.30, 0.60] },
  },
  {
    id: 'gifts',
    label: '引出物',
    examples: '引出物、引菓子、プチギフト',
    uplift: { standard: [0, 0.10], high: [0.10, 0.25] },
  },
  {
    id: 'paper',
    label: 'ペーパーアイテム',
    examples: '招待状、席次表、席札、メニュー表',
    uplift: { standard: [0, 0.10], high: [0.10, 0.20] },
  },
  {
    id: 'production',
    label: '演出・その他',
    examples: '司会料、音響・照明、演出アイテム',
    uplift: { standard: [0.10, 0.25], high: [0.25, 0.50] },
  },
  {
    id: 'other',
    label: 'その他',
    examples: 'サービス料、諸費用、分類に迷う持ち込み料など',
    uplift: { standard: [0, 0.10], high: [0.10, 0.20] },
  },
];

export function categoryExamples(category: CategoryId): string {
  return CATEGORIES.find((entry) => entry.id === category)?.examples ?? '';
}

/**
 * Human-readable uplift range for a category at a level, e.g.
 * 「+20〜40%」. The 'none' level means the initial figure is kept
 * as-is, shown as 「±0%」.
 */
export function upliftRangeText(
  category: CategoryId,
  level: UpliftLevel,
): string {
  if (level === 'none') return '±0%';

  const entry = CATEGORIES.find((candidate) => candidate.id === category);
  if (!entry) return '';

  const [min, max] = entry.uplift[level];
  const percent = (rate: number) => Math.round(rate * 100);
  return min === max
    ? `+${percent(min)}%`
    : `+${percent(min)}〜${percent(max)}%`;
}

/**
 * Keyword rules for guessing a category from a line-item name as
 * written on a real estimate. Rules are checked in order, so more
 * specific phrases (衣装持ち込み料) win over generic ones (持ち込み料).
 * Returns null when nothing matches.
 */
const CATEGORY_KEYWORDS: { keywords: string[]; category: CategoryId }[] = [
  { keywords: ['衣装', 'ドレス', 'タキシード', '小物'], category: 'attire' },
  { keywords: ['セレモニー', 'チャペル', '神殿', '挙式', '控室'], category: 'venue' },
  { keywords: ['会場使用', '会場料', '宴会場'], category: 'venue' },
  { keywords: ['料理', 'コース', 'ドリンク', '飲料', 'ケーキ'], category: 'food' },
  { keywords: ['装花', 'ブーケ', 'フラワー', '花束'], category: 'flowers' },
  { keywords: ['写真', 'ビデオ', '映像', 'アルバム', 'スナップ', 'エンドロール', '撮影'], category: 'photo' },
  { keywords: ['引出物', '引菓子', 'プチギフト', '引き出物'], category: 'gifts' },
  { keywords: ['招待状', '席次', '席札', 'メニュー表', 'ペーパー'], category: 'paper' },
  { keywords: ['司会', '音響', '照明', '演出', 'プロジェクション'], category: 'production' },
  { keywords: ['サービス料', '持ち込み', '持込'], category: 'other' },
];

export function suggestCategory(name: string): CategoryId | null {
  const trimmed = name.trim();
  if (trimmed === '') return null;

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => trimmed.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}

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
