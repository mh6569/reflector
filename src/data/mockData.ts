import { JournalEntry } from "../types";

export const mockEntries: JournalEntry[] = [
  {
    id: "entry-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    text:
      "Morning walk felt great—clear air and some creative ideas popped up. I noticed how a quiet start kept my mind from spiraling into the day’s to-do list, and I want to keep protecting that first hour.",
    sentiment: "positive",
    sentimentScore: 0.86,
  },
  {
    id: "entry-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    text:
      "Felt a bit tired after meetings. Short break helped reset, especially stepping outside for a slow lap around the block. Afternoon focus was better once I cut notifications and put on instrumental music.",
    sentiment: "neutral",
    sentimentScore: 0.52,
  },
  {
    id: "entry-3",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    text:
      "Pushed through an anxious afternoon, but an evening walk helped. The tension was mostly about an upcoming deadline and not knowing what to prioritize. Writing the list out and doing one small task made the evening calmer.",
    sentiment: "negative",
    sentimentScore: 0.34,
  },
];
