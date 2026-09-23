export type Prompt = {
  id: string;
  title: string;
  content: string;
  model: string;
  tokens: string; // display string for now, e.g. "180–420 (medium)" or "—"
  date: string; // display string for now, e.g. "Sep 18, 9:47 AM" or "Just now"
  rating: number; // 0–5
  note: string | null;
};

export const SEED_PROMPTS: Prompt[] = [
  {
    id: "seed-1",
    title: "WordPress Custom Block Generator",
    content:
      "Generate a Gutenberg block.json + edit.js + save.js scaffold for a block called {{name}} that supports {{attributes}}, following current core block conventions.",
    model: "claude-opus-4-1",
    tokens: "180–420 (medium)",
    date: "Sep 18, 9:47 AM",
    rating: 4,
    note: "Pair this with the actual block.json schema — it infers supports and attributes far more accurately with real context.",
  },
  {
    id: "seed-2",
    title: "React Component Refactor",
    content:
      "Refactor the following React component to use hooks instead of class lifecycle methods, keep prop types identical, and flag any unnecessary re-renders.",
    model: "gpt-4o-mini",
    tokens: "60–150 (low)",
    date: "Sep 20, 2:05 PM",
    rating: 5,
    note: null,
  },
];
