import { EmbeddingClient, SentimentClient } from "./localModel";
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

function detectActivities(text: string): Set<string> {
  const lower = text.toLowerCase();
  const acts = new Set<string>();
  if (lower.includes("walk") || lower.includes("outside")) acts.add("outdoors");
  if (lower.includes("creative") || lower.includes("idea") || lower.includes("sketch")) acts.add("creative");
  if (lower.includes("rest") || lower.includes("reset") || lower.includes("break")) acts.add("rest");
  if (lower.includes("call") || lower.includes("friend") || lower.includes("meeting")) acts.add("social");
  if (lower.includes("focus") || lower.includes("flow") || lower.includes("concentrated")) acts.add("focus");
  if (lower.includes("sleep") || lower.includes("tired") || lower.includes("fatigue")) acts.add("fatigue");
  return acts;
}

function cosineSimilarity(a?: number[], b?: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (!normA || !normB) return 0;
  return dot / (normA * normB);
}

function clusterBySimilarity(entries: JournalEntry[], threshold = 0.8): JournalEntry[][] {
  const clusters: JournalEntry[][] = [];
  const used = new Set<string>();
  for (const entry of entries) {
    if (!entry.embedding || used.has(entry.id)) continue;
    const cluster: JournalEntry[] = [entry];
    used.add(entry.id);
    for (const other of entries) {
      if (!other.embedding || used.has(other.id)) continue;
      if (cosineSimilarity(entry.embedding, other.embedding) >= threshold) {
        cluster.push(other);
        used.add(other.id);
      }
    }
    if (cluster.length > 1) clusters.push(cluster);
  }
  return clusters;
}

function buildInsights(enriched: JournalEntry[], period: InsightSummary["period"]): string[] {
  const total = enriched.length;
  if (!total) return ["Add a few entries to see insights."];

  const avg =
    enriched.reduce((sum, e) => sum + (e.sentimentScore ?? 0.5), 0) / Math.max(total, 1);
  const tags = topTags(enriched, 3);
  const days = dayCounts(enriched);
  const activityCounts = new Map<string, number>();

  enriched.forEach((entry) => {
    detectActivities(entry.text).forEach((a) => activityCounts.set(a, (activityCounts.get(a) ?? 0) + 1));
  });

  const bullets: string[] = [];
  if (avg > 0.65) bullets.push("Entries leaned positive; keep repeating what fueled that energy.");
  else if (avg < 0.4) bullets.push("Tone skewed tense; pair stressful days with quick resets.");
  else bullets.push("Mood stayed steady; consistency is working.");

  if (tags.length) bullets.push(`Themes surfacing: ${tags.join(", ")}.`);

  const topActivity = [...activityCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topActivity) {
    bullets.push(`You often mentioned ${topActivity[0]}; notice how it affects your mood.`);
  }

  if (period === "weekly" && Object.keys(days).length) {
    const busiest = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    if (busiest) bullets.push(`You wrote most on ${busiest[0]}; set a gentle prompt that day.`);
  }

  const clusters = clusterBySimilarity(enriched);
  if (clusters.length) {
    const first = clusters[0];
    const clusterTags = topTags(first, 2);
    const label = clusterTags.length ? clusterTags.join(", ") : "related moments";
    bullets.push(`Several entries clustered around: ${label}. Revisit what ties them together.`);
  }

  return bullets.slice(0, 3);
}

const sentimentClient = new SentimentClient();
const embeddingClient = new EmbeddingClient();

export async function analyzeEntries(entries: JournalEntry[]): Promise<JournalEntry[]> {
  await Promise.all([sentimentClient.load(), embeddingClient.load()]);
  const enriched: JournalEntry[] = [];
  for (const entry of entries) {
    const s = await sentimentClient.analyze(entry.text);
    const embedding = await embeddingClient.embed(entry.text);
    enriched.push({
      ...entry,
      sentiment: s.sentiment,
      sentimentScore: s.score,
      tags: inferTags(entry.text),
      embedding,
    });
  }
  return enriched;
}

export async function summarizePeriod(
  period: InsightSummary["period"],
  entries: JournalEntry[],
): Promise<InsightSummary> {
  const enriched = await analyzeEntries(entries);
  const insights = await buildInsights(enriched, period);
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
