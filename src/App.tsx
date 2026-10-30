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
  const { dispatch } = useAppState();
  const [tab, setTab] = useState<Tab>('estimate');
  const [confirmingReset, setConfirmingReset] = useState(false);

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
              onClick={() => {
                setTab(entry.id);
                window.scrollTo({ top: 0 });
              }}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        <section className="hero">
          <h1>最初の見積もりだけで、選んでいませんか。</h1>
          <p>
            式場の初期見積もりは最低ランクの構成で作られがちです。項目を揃えて比べ、「上がりやすい分」まで見える化すると、本当の総額で選べます。
          </p>
        </section>
        <div
          id="main-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'estimate' && <EstimateEditor />}
          {tab === 'compare' && <Comparison />}
          {tab === 'simulate' && <Simulator />}
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
