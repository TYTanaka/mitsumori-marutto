# みつもりまるっと 仕様（司令塔：はね / 実装：Codex）

## コンセプト
結婚式場の「初期見積もり」は最低ランク構成で作られ、打ち合わせで総額が上がっていく。
カップルは項目名もバラバラな各式場の見積もりを横並びで比較できず、最初の金額に
引っ張られて選んでしまう（アンカリング）。
本アプリは、見積もりを共通カテゴリに揃えて比較し、「上がりやすい項目」の想定を
入れることで最終総額の予測レンジを可視化する道具である。
予測は目安であり、正確な予測を謳わない（UI文言でも明示する）。

## データモデル
- Venue { id, name, memo }
- LineItem { id, venueId, category: CategoryId, name, amount }  // amount は税込・円
- CategoryId: 'venue' | 'attire' | 'food' | 'flowers' | 'photo' | 'gifts' | 'paper' | 'production' | 'other'
  - venue=挙式・会場, attire=衣装, food=料理・飲料, flowers=装花, photo=写真・映像,
    gifts=引出物, paper=ペーパーアイテム, production=演出・その他, other=その他
- Assumptions（式場ごと）: Record<CategoryId, UpliftLevel>  // 'none' | 'standard' | 'high'
  ＋ guestDelta: number（当初の想定人数からの増減、既定0）

## 総額予測（決定的な純粋関数）
カテゴリごとに「上がり率の範囲」を持つ（目安値、カテゴリ定義に同梱）:
- attire: standard +20〜40%, high +40〜80%
- flowers: standard +15〜35%, high +35〜70%
- food: standard +5〜15%, high +15〜30%
- photo: standard +10〜30%, high +30〜60%
- gifts: standard +0〜10%, high +10〜25%
- paper: standard +0〜10%, high +10〜20%
- production: standard +10〜25%, high +25〜50%
- venue: standard +0〜5%, high +5〜10%
- other: standard +0〜10%, high +10〜20%
人数増減は per-head 単価（food+gifts+paper の合計 ÷ 想定人数）で換算する。
想定人数 baseGuests は式場ごとに持つ（既定 60）。

predictTotal(state, venueId) → {
  base: number,
  low: number,   // base + Σカテゴリ下限アップリフト + 人数影響（下限側）
  high: number,  // 同・上限
  byCategory: { category, base, low, high }[]
}
rankingFlip(venues, predictions) → 初期総額の順位と予測中央値の順位が異なる式場があれば返す。

## 画面
1. ヘッダー＋タブ: 「見積もり」「比較」「総額シミュレーション」
2. 見積もりタブ: 式場の追加/削除、式場ごとに明細の追加/編集/削除（カテゴリ選択＋項目名＋金額）、式場合計
3. 比較タブ: カテゴリ×式場のマトリクス表、各カテゴリ最安の強調、初期総額の行
4. シミュレーションタブ: 式場ごとにカテゴリ別の上がり想定（3段階）と人数増減を設定。
   初期総額バーと予測レンジバーを並べ、差額と順位変動を表示する。

## サンプルデータ
3式場。初期総額は A < B < C の順だが、想定（standard一律）を入れると
予測中央値で順位が入れ替わるよう金額を設計する（コンセプトのデモになる）。

## 保存
localStorage（バージョン付き）。バックエンドなし。

## デザイン
- 紙（アイボリー）の地に、深いネイビー＋ゴールドの差し色。見出しは明朝、数字は等幅寄り。
- 「数字の読みやすさ」が最優先。大きな総額表示、レンジバーで範囲を一目で。
- レスポンシブ（スマホで比較表は式場切替＋縦リストにフォールバック可）。
