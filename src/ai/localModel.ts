import { InsightSummary, JournalEntry } from "../types";

type TextGenerator = (input: string, options: { max_new_tokens: number }) => Promise<
  Array<{
    generated_text: string;
  }>
>;

/**
 * LocalLLMClient wraps a transformers.js pipeline. It can run fully on-device;
 * if the model fails to load, it falls back to deterministic summaries.
 */
export class LocalLLMClient {
  private generator: TextGenerator | null = null;

  async load(model = "Xenova/gpt2"): Promise<void> {
    if (this.generator) return;
    try {
      const { pipeline } = await import("@xenova/transformers");
      const generate = await pipeline("text-generation", model);
      this.generator = (input: string, options: { max_new_tokens: number }) =>
        generate(input, options) as unknown as ReturnType<TextGenerator>;
    } catch (error) {
      console.warn("Falling back to stub summarizer:", error);
      this.generator = null;
    }
  }

  async summarize(period: InsightSummary["period"], entries: JournalEntry[]): Promise<string[]> {
    const context = this.buildPrompt(period, entries);

    if (!this.generator) {
      return this.stubSummary(entries);
    }

    try {
      const [result] = await this.generator(context, { max_new_tokens: 120 });
      const text = result.generated_text.replace(context, "").trim();
      return this.chunkSentences(text);
    } catch (error) {
      console.warn("LLM generation failed, using stub:", error);
      return this.stubSummary(entries);
    }
  }

  private buildPrompt(period: InsightSummary["period"], entries: JournalEntry[]): string {
    const recent = entries
      .slice(-6)
      .map((entry) => `- ${new Date(entry.createdAt).toDateString()}: ${entry.text}`)
      .join("\n");

    return [
      "You are a gentle reflection companion running fully on-device.",
      "Write 2-3 short bullet insights that connect themes, moods, and routines.",
      "Avoid restating the same sentence; focus on patterns over the selected period.",
      `Period: ${period}`,
      "Entries:",
      recent,
      "Insights:",
    ].join("\n");
  }

  private stubSummary(entries: JournalEntry[]): string[] {
    if (entries.length === 0) {
      return ["No entries yet. Capture a few short reflections to see weekly insights."];
    }

    const averageLength =
      entries.reduce((sum, e) => sum + e.text.split(" ").length, 0) / entries.length;

    const emphasis =
      averageLength > 60
        ? "Your reflections are getting deeper—consider highlighting key takeaways."
        : "Short, frequent notes are helping you spot patterns without overthinking.";

    return [
      "You stayed consistent this period; keep favoring steady writing over perfection.",
      emphasis,
      "Experiment with a recurring cue (walk, stretch, or reset) and note how it shapes your energy.",
    ];
  }

  private chunkSentences(text: string): string[] {
    return text
      .split(/[\.\n]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
  }
}
