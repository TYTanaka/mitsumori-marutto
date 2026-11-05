import { useState } from 'react';
import { AppStateProvider, useAppState } from './store/appState';
import { EstimateEditor } from './components/EstimateEditor';
import { Comparison } from './components/Comparison';
import { Simulator } from './components/Simulator';
import './index.css';

type Tab = 'estimate' | 'compare' | 'simulate';

const tabs: { id: Tab; label: string }[] = [
  { id: 'estimate', label: '見積もり' },
  { id: 'compare', label: '比較' },
  { id: 'simulate', label: '総額シミュレーション' },
];

function Shell() {
  const { dispatch, saveFailed } = useAppState();
  const [tab, setTab] = useState<Tab>('estimate');
  const [confirmingReset, setConfirmingReset] = useState(false);

  const goTo = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <header className="app-header">
        <div className="brand-wrap">
          <span className="brand-mark" aria-hidden="true">み</span>
          <div>
            <p className="brand">みつもりまるっと</p>
            <p className="brand-sub">結婚式見積もりの総額チェッカー</p>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="メインメニュー">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              id={`tab-${entry.id}`}
              className="tab"
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              aria-controls="main-panel"
              onClick={() => goTo(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {saveFailed && (
          <p className="save-error" role="alert">
            データを保存できませんでした。ブラウザの空き容量やプライベートモードの設定をご確認ください（このまま操作は続けられますが、ページを閉じると変更が失われます）。
          </p>
        )}
        {tab === 'estimate' ? (
          <section className="hero">
            <h1>最初の見積もりだけで、選んでいませんか。</h1>
            <p>
              式場の初期見積もりは最低ランクの構成で作られがちです。項目を揃えて比べ、「上がりやすい分」まで見える化すると、本当の総額で選べます。
            </p>
          </section>
        ) : (
          // Every tab carries exactly one <h1>: the full hero on the
          // estimate tab, this compact one-liner (same styling) on the
          // others, so the heading outline never loses its top level.
          <h1 className="hero-compact">
            {tab === 'compare'
              ? '項目を揃えて、式場を横並びで比べます。'
              : '「上がりやすい分」まで含めた、総額の目安です。'}
          </h1>
        )}
        <div
          id="main-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'estimate' && (
            <EstimateEditor onShowComparison={() => goTo('compare')} />
          )}
          {tab === 'compare' && (
            <Comparison
              onShowEstimate={() => goTo('estimate')}
              onShowSimulation={() => goTo('simulate')}
            />
          )}
          {tab === 'simulate' && (
            <Simulator onShowEstimate={() => goTo('estimate')} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              if (confirmingReset) {
                dispatch({ type: 'reset' });
                setConfirmingReset(false);
              } else {
                setConfirmingReset(true);
              }
            }}
          >
            {confirmingReset ? '本当に戻す？' : 'サンプルデータに戻す'}
          </button>
          {confirmingReset && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setConfirmingReset(false)}
            >
              やめる
            </button>
          )}
        </div>
        <p className="muted">データはこのブラウザに保存されます。</p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
