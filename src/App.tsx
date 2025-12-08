import { FormEvent, useEffect, useMemo, useState } from "react";
import { analyzeEntries, summarizePeriod } from "./ai/insightEngine";
import { mockEntries } from "./data/mockData";
import { InsightSummary, JournalEntry } from "./types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildPrompt(entries: JournalEntry[]): string {
  const latest = entries[0];
  if (!latest) return "What stood out to you today? Start with one detail.";
  const tags = latest.tags ?? [];
  if (tags.includes("stressed") || tags.includes("anxious")) {
    return "What helped you steady yourself today? Capture one thing that eased the stress.";
  }
  if (tags.includes("creative")) {
    return "What sparked your creativity? Jot the idea before it fades.";
  }
  if (tags.includes("rest")) {
    return "How did you recharge today? Note what made rest feel restorative.";
  }
  if (tags.includes("energized")) {
    return "Where did your energy come from? Name the routine you want to repeat.";
  }
  return "What shifted your mood today? Write a few lines to capture it.";
}
type Page = "home" | "entries" | "insights";

export default function App() {
  const [entries, setEntries] = useState<JournalEntry[]>(mockEntries);
  const [taggedEntries, setTaggedEntries] = useState<JournalEntry[]>([]);
  const [insight, setInsight] = useState<InsightSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [draft, setDraft] = useState("");

  const sortedTagged = useMemo(
    () =>
      [...taggedEntries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [taggedEntries],
  );
  const insightEntries = useMemo(() => sortedTagged.slice(0, 6), [sortedTagged]);
  const prompt = useMemo(() => buildPrompt(taggedEntries), [taggedEntries]);

  async function generateInsight() {
    setLoading(true);
    setError(null);
    try {
      const summary = await summarizePeriod("weekly", insightEntries.length ? insightEntries : entries);
      setInsight(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate local insight.";
      setError(message);
      setInsight(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function process() {
      setLoading(true);
      try {
        const tagged = await analyzeEntries(entries);
        if (active) setTaggedEntries(tagged);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Analysis failed.");
      } finally {
        if (active) setLoading(false);
      }
    }
    process();
    return () => {
      active = false;
    };
  }, [entries]);

  const navButton = (id: Page, label: string) => (
    <button
      className={page === id ? "nav-btn active" : "nav-btn"}
      onClick={() => setPage(id)}
      type="button"
    >
      {label}
    </button>
  );

  function handleNewEntry(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const next: JournalEntry = {
      id: `entry-${Date.now()}`,
      createdAt: new Date().toISOString(),
      text,
    };
    const updated = [next, ...entries];
    setEntries(updated);
    setDraft("");
  }

  const renderLanding = () => (
    <>
      <section className="panel hero">
        <h1>Reflector — local journaling with private AI</h1>
        <p className="subtitle">
          Insightful reflection summaries, context-aware prompts, and mood patterns—generated on your
          device to keep everything private and non-judgmental.
        </p>
        <div className="hero-cta">
          <button onClick={() => setPage("entries")}>Start a new entry</button>
          <button className="btn-secondary" onClick={() => setPage("insights")}>
            View insights
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Why Reflector</h2>
        <p className="text-muted">
          On a weekly or monthly basis, the AI generates gentle summaries of key themes and progress.
          Example: “You mentioned feeling most energized on days you had a morning walk. You also
          wrote about creative ideas more frequently during those weeks.” This helps you connect the
          dots without extra effort.
        </p>
      </section>

      <section className="panel">
        <h2>What you can do</h2>
        <div className="feature-grid stagger">
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Context-Aware Prompts</h3>
            <p>Never face a blank page. Get gentle prompts based on your recent entries.</p>
            <button className="badge" onClick={() => setPage("entries")}>
              Try it now
            </button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Mood Patterns</h3>
            <p>See how your energy shifts over time. Notice what lifts you up.</p>
            <button className="badge" onClick={() => setPage("insights")}>
              View insights
            </button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Local AI Analysis</h3>
            <p>Sentiment and themes run privately on-device to keep your writing yours.</p>
            <button className="badge" onClick={() => setPage("entries")}>
              Get started
            </button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Weekly Reflections</h3>
            <p>Short summaries of key themes, mood trends, and questions to ponder.</p>
            <button className="badge" onClick={() => setPage("insights")}>
              See summary
            </button>
          </div>
        </div>
      </section>
    </>
  );

  const renderEntries = () => (
    <section className="panel">
      <div className="header" style={{ padding: 0, marginBottom: "1rem" }}>
        <div>
          <h2>Journal entries</h2>
          <p className="text-muted">Review recent reflections with quick themes for each entry.</p>
        </div>
        <div className="pill">Local AI analysis</div>
      </div>
      {error && (
        <div className="callout danger" style={{ marginBottom: "1rem" }}>
          <strong>Analysis issue.</strong> {error}
        </div>
      )}
      <div className="entry-list">
        <div className="card">
          <h3>Context-aware prompt</h3>
          <div className="prompt-box">{prompt}</div>
        </div>

        <form onSubmit={handleNewEntry} className="entry-card">
          <label htmlFor="entry-text">New entry</label>
          <textarea
            id="entry-text"
            placeholder="How are you arriving right now?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="pill-row">
            <button type="submit" disabled={!draft.trim()}>
              Add entry
            </button>
            <button type="button" className="ghost" onClick={() => setDraft("")}>
              Reset
            </button>
          </div>
        </form>

        {sortedTagged.map((entry) => {
          const themes = entry.tags ?? [];
          return (
            <article key={entry.id} className="entry-card">
              <div className="entry-header">
                <div className="text-secondary">{formatDate(entry.createdAt)}</div>
                {entry.sentiment ? (
                  <span className={`sentiment ${entry.sentiment}`}>{entry.sentiment}</span>
                ) : null}
              </div>
              <p>{entry.text}</p>
              <div className="pill-row mt-sm">
                {themes.length > 0 ? (
                  themes.map((theme) => (
                    <span key={theme} className="pill">
                      {theme}
                    </span>
                  ))
                ) : (
                  <span className="pill">No themes yet</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderInsights = () => (
    <section className="panel">
      <h2>Weekly insight</h2>
      <p className="text-muted">
        Summaries are generated locally to stay private and non-judgmental. Regenerate anytime.
      </p>
      <div className="pill-row" style={{ marginBottom: "0.75rem" }}>
        <button type="button" onClick={generateInsight} disabled={loading}>
          {loading ? "Generating..." : "Generate insight"}
        </button>
      </div>
      {error ? (
        <div className="callout danger">
          <strong>Local model unavailable.</strong> {error}
        </div>
      ) : loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div>Loading local model and generating insight…</div>
        </div>
      ) : insight ? (
        <>
          <div className="stagger">
            {insight.insights.map((line, idx) => (
              <div key={line} className="highlight-card" style={{ animationDelay: `${idx * 80}ms` }}>
                {line}
              </div>
            ))}
          </div>
          <h3 className="mt-md">Theme keywords</h3>
          <p className="text-muted">Quick pulse of what showed up most in recent reflections.</p>
          <div className="pill-row">
            {insight.themeKeywords.map((keyword) => (
              <span key={keyword} className="pill">
                {keyword}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">✨</div>
          <div>Click “Generate insight” to see your summary.</div>
        </div>
      )}
    </section>
  );

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
          {navButton("home", "Home")}
          {navButton("entries", "Entries")}
          {navButton("insights", "Insights")}
        </div>
        <div className="auth-status authenticated">Offline · Private</div>
      </header>

      <main>
        {page === "home" && renderLanding()}
        {page === "entries" && renderEntries()}
        {page === "insights" && renderInsights()}
      </main>

      <footer className="footer">
        <div className="footer-text">Local, private, and built to stay on your device.</div>
        <div className="pill">Private by design · Empathetic AI</div>
      </footer>
    </div>
  );
}
