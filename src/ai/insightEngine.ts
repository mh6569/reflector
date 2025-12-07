import { SentimentClient } from "./localModel";
import { JournalEntry, InsightSummary, ThemeTag } from "../types";

const TAG_RULES: Array<{ tags: ThemeTag[]; keywords: string[] }> = [
  { tags: ["energized"], keywords: ["energized", "energy", "charged"] },
  { tags: ["tired", "drained"], keywords: ["tired", "fatigue", "exhausted", "drained"] },
  { tags: ["stressed", "anxious"], keywords: ["stressed", "tense", "anxious", "pressure"] },
  { tags: ["calm"], keywords: ["calm", "steady", "grounded"] },
  { tags: ["creative"], keywords: ["creative", "idea", "sketch", "writing"] },
  { tags: ["social"], keywords: ["friend", "call", "people", "conversation"] },
  { tags: ["rest"], keywords: ["rest", "nap", "break", "reset"] },
  { tags: ["focused"], keywords: ["focus", "flow", "concentrated"] },
  { tags: ["grateful"], keywords: ["grateful", "gratitude", "thankful", "appreciate"] },
];

function inferTags(text: string, limit = 3): ThemeTag[] {
  const lower = text.toLowerCase();
  const scores = new Map<ThemeTag, number>();
  TAG_RULES.forEach(({ tags, keywords }) => {
    const hit = keywords.some((k) => lower.includes(k));
    if (hit) tags.forEach((t) => scores.set(t, (scores.get(t) ?? 0) + 1));
  });
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function topTags(entries: JournalEntry[], limit = 5): ThemeTag[] {
  const counts = new Map<ThemeTag, number>();
  entries.forEach((entry) => entry.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function dayCounts(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.forEach((entry) => {
    const day = new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: "short" });
    counts[day] = (counts[day] ?? 0) + 1;
  });
  return counts;
}

function buildInsights(enriched: JournalEntry[], period: InsightSummary["period"]): string[] {
  const total = enriched.length;
  if (!total) return ["Add a few entries to see insights."];

  const avg =
    enriched.reduce((sum, e) => sum + (e.sentimentScore ?? 0.5), 0) / Math.max(total, 1);
  const tags = topTags(enriched, 3);
  const textBlob = enriched.map((e) => e.text.toLowerCase()).join(" ");
  const days = dayCounts(enriched);

  const bullets: string[] = [];
  if (avg > 0.65) bullets.push("Entries leaned positive—keep leaning into what fuels that energy.");
  else if (avg < 0.4) bullets.push("Tone skewed tense; short resets on heavy days may help.");
  else bullets.push("Mood stayed steady; consistency is working.");

  if (tags.length) bullets.push(`Themes surfacing: ${tags.join(", ")}.`);

  const walk = textBlob.includes("walk") || textBlob.includes("outside");
  if (walk) bullets.push("Time outdoors often paired with better tone—protect that routine.");

  const creative = textBlob.includes("creative") || textBlob.includes("idea");
  if (creative) bullets.push("Creative sessions showed up—capture ideas right after while energy is high.");

  const rest = textBlob.includes("rest") || textBlob.includes("reset") || textBlob.includes("break");
  if (rest) bullets.push("Short breaks helped; schedule them when the day feels heavy.");

  if (period === "weekly" && Object.keys(days).length) {
    const busiest = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    if (busiest) bullets.push(`You wrote most on ${busiest[0]}; anchor a prompt that day.`);
  }

  return bullets.slice(0, 3);
}

const sentimentClient = new SentimentClient();

export async function analyzeEntries(entries: JournalEntry[]): Promise<JournalEntry[]> {
  await sentimentClient.load();
  const enriched: JournalEntry[] = [];
  for (const entry of entries) {
    const s = await sentimentClient.analyze(entry.text);
    enriched.push({
      ...entry,
      sentiment: s.sentiment,
      sentimentScore: s.score,
      tags: inferTags(entry.text),
    });
  }
  return enriched;
}

export async function summarizePeriod(
  period: InsightSummary["period"],
  entries: JournalEntry[],
): Promise<InsightSummary> {
  const enriched = await analyzeEntries(entries);
  const insights = buildInsights(enriched, period);
  const avg =
    enriched.reduce((sum, e) => sum + (e.sentimentScore ?? 0.5), 0) / Math.max(enriched.length, 1);

  return {
    id: `insight-${period}-${Date.now()}`,
    period,
    insights,
    averageSentiment: Number(avg.toFixed(2)),
    themeKeywords: topTags(enriched, 5),
    generatedAt: new Date().toISOString(),
  };
}
