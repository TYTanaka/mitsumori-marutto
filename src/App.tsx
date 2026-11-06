import { useRef, useState } from 'react';
import { AppStateProvider, useAppState } from './store/appState';
import { EstimateEditor } from './components/EstimateEditor';
import { Comparison } from './components/Comparison';
import { Simulator } from './components/Simulator';
import {
  buildShareUrl,
  parseStateJson,
  stateToJson,
} from './lib/dataTransfer';
import './index.css';

/**
 * Data portability actions: copy a share link that reproduces the
 * current data on another device, export the data as JSON, and import
 * such a JSON file back. Imports are validated first; a rejected file
 * reports the reason and leaves the current data untouched.
 */
function DataActions() {
  const { state, dispatch } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyShareLink = async () => {
    const url = buildShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        '共有リンクをコピーしました。リンクを開くと、いまのデータがそのまま表示されます。',
      );
      setError(null);
      setFallbackUrl(null);
    } catch {
      // The Clipboard API is unavailable in some browsers/contexts:
      // show the link itself so it can still be copied by hand.
      setError(
        '自動でコピーできませんでした。下に表示されるリンクをコピーしてください。',
      );
      setNotice(null);
      setFallbackUrl(url);
    }
  };

  const exportJson = () => {
    const blob = new Blob([stateToJson(state)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mitsumori-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(
      'JSONファイルを書き出しました。別の端末では「JSONを読み込む」から取り込めます。',
    );
    setError(null);
  };

  const importJson = async (file: File) => {
    const result = parseStateJson(await file.text());

    if (result.ok) {
      dispatch({ type: 'hydrate', state: result.state });
      setNotice('データを読み込みました。');
      setError(null);
    } else {
      setError(
        `データを読み込めませんでした：${result.error}。現在のデータはそのまま残っています。`,
      );
      setNotice(null);
    }
  };

  return (
    <div className="data-actions">
      <div className="data-actions-buttons">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={copyShareLink}
        >
          共有リンクをコピー
        </button>
        <button className="btn btn-ghost" type="button" onClick={exportJson}>
          JSONを書き出す
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          JSONを読み込む
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="JSONファイルを選択"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void importJson(file);
            }
            event.target.value = '';
          }}
        />
      </div>
      {notice && (
        <p className="data-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="data-error" role="alert">
          {error}
        </p>
      )}
      {fallbackUrl && (
        <input
          className="input share-url-fallback"
          aria-label="共有リンク"
          readOnly
          value={fallbackUrl}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}

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
        <p className="muted">
          データはこのブラウザに保存されます。別の端末で続ける場合は、共有リンクかJSONでの引き継ぎが使えます。
        </p>
        <DataActions />
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
