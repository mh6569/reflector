export type Sentiment = "positive" | "neutral" | "negative";

export type JournalEntry = {
  id: string;
  createdAt: string;
  text: string;
  sentiment?: Sentiment;
  sentimentScore?: number;
  embedding?: number[];
  tags?: ThemeTag[];
};

export type InsightSummary = {
  id: string;
  period: "weekly" | "monthly";
  insights: string[];
  averageSentiment: number;
  themeKeywords: string[];
  generatedAt: string;
};

export type ThemeTag =
  | "energized"
  | "tired"
  | "drained"
  | "stressed"
  | "calm"
  | "anxious"
  | "creative"
  | "social"
  | "rest"
  | "focused"
  | "grateful";
