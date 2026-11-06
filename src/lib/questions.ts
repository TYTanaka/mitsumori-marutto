import type { AppState, CategoryId } from '../types';
import { CATEGORIES } from './categories';
import { uncountedCategories } from './calc';

export interface VenueQuestion {
  category: CategoryId;
  /** True when the category is missing from the estimate entirely. */
  missing: boolean;
  question: string;
}

/**
 * Questions to ask a venue about categories that are missing from
 * its estimate (未計上): what it costs when it turns out to be needed.
 */
const MISSING_QUESTIONS: Record<CategoryId, string> = {
  venue:
    '挙式・会場使用料に含まれない設備や備品があれば、追加料金を教えてください。',
  attire:
    '衣装は見積もりに含まれていません。当日着用する場合の料金と、含まれる点数を教えてください。',
  food: '料理・飲料は見積もりに含まれていません。コースの内容と1人あたりの料金を教えてください。',
  flowers:
    '装花は見積もりに含まれていません。メインテーブルとゲストテーブル分の料金を教えてください。',
  photo:
    '写真・映像は見積もりに含まれていません。撮影内容とアルバム・データ納品の料金を教えてください。',
  gifts:
    '引出物は見積もりに含まれていません。1人あたりの料金と品目の内容を教えてください。',
  paper:
    'ペーパーアイテムは見積もりに含まれていません。招待状・席次表・席札の料金を教えてください。',
  production:
    '司会・音響などの演出まわりは見積もりに含まれていません。別料金になるものを教えてください。',
  other:
    'サービス料の計算方法と、この見積もり以外に発生しうる費用があれば教えてください。',
};

/**
 * Questions for categories that are on the estimate but tend to grow
 * between the initial quote and the final bill: what rank is quoted,
 * and what makes it go up.
 */
const CHECK_QUESTIONS: Record<CategoryId, string> = {
  venue: '会場使用料に含まれる設備・備品の範囲を教えてください。',
  attire:
    '衣装はどのランクの内容ですか。人気の衣装やランクアップ時の差額も教えてください。',
  food: '料理のランクと内容、ドリンクがフリードリンクかどうかを教えてください。',
  flowers:
    '装花はどのランク・ボリュームですか。ゲストテーブル分も含まれますか。',
  photo:
    '写真・映像はどこまで含まれますか（アルバムの有無、データ納品の有無）。',
  gifts: '引出物は何品目ですか。持ち込みは可能ですか。',
  paper: 'ペーパーアイテムのデザインと部数の条件を教えてください。',
  production:
    '演出まわりで、当日の希望によって追加料金になりやすいものを教えてください。',
  other:
    'サービス料の計算方法と、見積もり以外に発生しうる費用があれば教えてください。',
};

/** Standard-uplift ceiling at or above which a counted category is
 * worth a confirmation question even at the 'standard' assumption. */
const CHECK_UPLIFT_THRESHOLD = 0.25;

/**
 * Builds the list of questions to ask a venue before deciding:
 * every category missing from its estimate, plus counted categories
 * whose total tends to rise (a high-uplift category, or one the user
 * marked as 高め). Order follows the category order.
 */
export function generateQuestions(
  state: AppState,
  venueId: string,
): VenueQuestion[] {
  const missing = new Set(uncountedCategories(state, venueId));
  const assumptions = state.assumptions[venueId];
  const questions: VenueQuestion[] = [];

  for (const category of CATEGORIES) {
    if (missing.has(category.id)) {
      questions.push({
        category: category.id,
        missing: true,
        question: MISSING_QUESTIONS[category.id],
      });
      continue;
    }

    const level = assumptions?.[category.id] ?? 'standard';
    const standardCeiling = category.uplift.standard[1];
    if (level === 'high' || standardCeiling >= CHECK_UPLIFT_THRESHOLD) {
      questions.push({
        category: category.id,
        missing: false,
        question: CHECK_QUESTIONS[category.id],
      });
    }
  }

  return questions;
}

/** Plain-text rendering of the question list, for copying. */
export function questionsToText(
  venueName: string,
  questions: VenueQuestion[],
): string {
  const lines = questions.map(
    (entry, index) => `${index + 1}. ${entry.question}`,
  );
  return [`${venueName} への確認事項`, ...lines].join('\n');
}
