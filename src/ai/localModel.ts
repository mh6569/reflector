import { pipeline, env } from "@xenova/transformers";
import { Sentiment } from "../types";

type SentimentResult = { label: string; score: number };
type SentimentClassifier = (input: string) => Promise<SentimentResult[]>;
type EmbeddingOutput = number[][] | number[];
type EmbeddingPipeline = (input: string) => Promise<EmbeddingOutput>;

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

export class EmbeddingClient {
  private embedder: EmbeddingPipeline | null = null;

  async load(): Promise<void> {
    if (this.embedder) return;
    env.allowLocalModels = false;
    env.remoteModels = true;
    this.embedder = (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")) as EmbeddingPipeline;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.embedder) throw new Error("Embedding model not loaded");
    const output = await this.embedder(text);
    const tokens = this.toTokenMatrix(output);
    const hiddenSize = tokens[0]?.length ?? 0;
    if (!hiddenSize) return [];

    const pooled = new Array(hiddenSize).fill(0);
    tokens.forEach((tokenVec) => {
      tokenVec.forEach((v, i) => {
        pooled[i] += v;
      });
    });
    return pooled.map((v) => v / tokens.length);
  }

  private toTokenMatrix(output: EmbeddingOutput): number[][] {
    // Handles shapes: [1, seq_len, hidden] or [seq_len, hidden] or [hidden]
    if (Array.isArray(output) && Array.isArray(output[0])) {
      const first = output[0] as any;
      if (Array.isArray(first) && Array.isArray(first[0])) {
        // [batch, seq, hidden] -> take first batch
        return first as number[][];
      }
      return output as number[][];
    }
    return [output as number[]];
  }
}
