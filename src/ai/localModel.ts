import { pipeline, env } from "@xenova/transformers";
import { Sentiment } from "../types";

type SentimentResult = { label: string; score: number };
type SentimentClassifier = (input: string) => Promise<SentimentResult[]>;

export class SentimentClient {
  private classifier: SentimentClassifier | null = null;

  async load(): Promise<void> {
    if (this.classifier) return;
    env.allowLocalModels = false;
    env.remoteModels = true;
    this.classifier = (await pipeline(
      "sentiment-analysis",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    )) as SentimentClassifier;
  }

  async analyze(text: string): Promise<{ sentiment: Sentiment; score: number }> {
    if (!this.classifier) throw new Error("Sentiment model not loaded");
    const [res] = await this.classifier(text);
    const label = res.label.toLowerCase();
    if (label.includes("pos")) return { sentiment: "positive", score: res.score };
    if (label.includes("neg")) return { sentiment: "negative", score: res.score };
    return { sentiment: "neutral", score: res.score };
  }
}
