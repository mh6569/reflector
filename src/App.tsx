import { useEffect, useState } from "react";
import { insightEngine } from "./ai/engines";
import { mockEntries } from "./data/mockData";
import { InsightSummary, JournalEntry } from "./types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function App() {
  const [entries] = useState<JournalEntry[]>(mockEntries);
  const [insight, setInsight] = useState<InsightSummary | null>(null);

  useEffect(() => {
    insightEngine
      .summarize("weekly", entries)
      .then(setInsight)
      .catch(() => {
        setInsight(null);
      });
  }, [entries]);

  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <div className="logo" />
          <div className="brand-text">
            <div className="title">Reflector</div>
            <div className="tagline">Local-first journaling with gentle AI</div>
          </div>
        </div>
        <div className="nav">
          <a className="active">Home</a>
          <a>Entries</a>
          <a>Insights</a>
        </div>
        <div className="auth-status authenticated">Offline · Private</div>
      </header>

      <main>
        <section className="panel hero">
          <h1>Reflect with an on-device companion</h1>
          <p className="subtitle">
            Private by default, steady by design: local insights and a calm writing canvas that stays
            on your device.
          </p>
          <div className="hero-cta">
            <button>New entry</button>
            <button className="btn-secondary">View insights</button>
          </div>
        </section>

        <section className="grid two">
          <article className="panel">
            <h2>Weekly insight</h2>
            <p className="text-muted">Summaries are generated locally to stay private and non-judgmental.</p>
            {insight ? (
              <div className="stagger">
                {insight.insights.map((line, idx) => (
                  <div key={line} className="highlight-card" style={{ animationDelay: `${idx * 80}ms` }}>
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <div>Generating on-device insight...</div>
              </div>
            )}
          </article>

          <article className="panel">
            <h2>Theme keywords</h2>
            <p className="text-muted">Quick pulse of what showed up most in recent reflections.</p>
            <div className="pill-row">
              {(insight?.themeKeywords ?? []).map((keyword) => (
                <span key={keyword} className="pill">
                  {keyword}
                </span>
              ))}
              {(!insight || insight.themeKeywords.length === 0) && (
                <span className="pill">Capturing themes…</span>
              )}
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="prompt-box">
            “What shifted your energy today? Capture it in a few lines.”
          </div>
          <div className="grid two mt-lg">
            <div>
              <label htmlFor="entry">New entry</label>
              <textarea id="entry" placeholder="Start typing..." defaultValue="" />
              <div className="flex gap-sm">
                <button disabled>Save (mock)</button>
                <button className="ghost">Reset</button>
              </div>
            </div>
            <div className="card">
              <h3>Recent entries</h3>
              <ul className="list">
                {entries.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <div className="text-secondary">{formatDate(entry.createdAt)}</div>
                      <div>{entry.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-text">Local, private, and built to stay on your device.</div>
        <div className="pill">Private by design · Empathetic AI</div>
      </footer>
    </div>
  );
}
