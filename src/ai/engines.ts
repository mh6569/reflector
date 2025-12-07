import { InsightSummary, JournalEntry } from "../types";
import { LocalLLMClient } from "./localModel";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "was",
  "it",
  "is",
  "at",
  "that",
  "this",
  "as",
  "but",
  "by",
  "or",
  "be",
]);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

class EntryAnalyzer {
  constructor(private readonly entries: JournalEntry[]) {}

  averageSentiment(): number {
    if (this.entries.length === 0) return 0;
    const total = this.entries.reduce((sum, entry) => sum + (entry.sentimentScore ?? 0.5), 0);
    return total / this.entries.length;
  }

  topKeywords(limit: number): string[] {
    const counts = new Map<string, number>();
    for (const entry of this.entries) {
      for (const token of normalize(entry.text)) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }
}

export class InsightEngine {
  constructor(private readonly llm: LocalLLMClient) {}

  async summarize(
    period: InsightSummary["period"],
    entries: JournalEntry[],
  ): Promise<InsightSummary> {
    const analyzer = new EntryAnalyzer(entries);
    const themeKeywords = analyzer.topKeywords(5);
    await this.llm.load();
    const insights = await this.llm.summarize(period, entries);

    return {
      id: `insight-${period}-${Date.now()}`,
      period,
      insights,
      averageSentiment: Number(analyzer.averageSentiment().toFixed(2)),
      themeKeywords,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const insightEngine = new InsightEngine(new LocalLLMClient());
