import { createHash } from "crypto";

export type StructuredSummary = {
  title: string;
  bullets: string[];
  actionItems: string[];
  risks: string[];
};

export function hashNoteInput(title: string, body: string) {
  return createHash("sha256").update(`${title}\n${body}`).digest("hex");
}

export async function summarizeNoteStructured(input: {
  title: string;
  body: string;
  model: string;
}): Promise<StructuredSummary> {
  const mock = process.env.MOCK_AI === "1" || !process.env.LLM_API_KEY;
  if (mock) {
    const firstLine = input.body.trim().split("\n").find((l) => l.trim())?.trim() ?? "";
    return {
      title: `Summary: ${input.title.slice(0, 80)}`,
      bullets: firstLine
        ? [`From body: ${firstLine.slice(0, 160)}`, "Mock bullet B"]
        : ["Mock bullet A", "Mock bullet B"],
      actionItems: firstLine ? ["Mock action (body was non-empty)"] : ["Mock action"],
      risks: ["Mock risk"],
    };
  }

  const base = process.env.LLM_API_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1";
  const key = process.env.LLM_API_KEY!;
  const model = process.env.SUMMARIZE_MODEL || input.model;

  const system =
    "Return ONLY valid JSON with keys title (string), bullets (string[]), actionItems (string[]), risks (string[]). No markdown. " +
    "Derive bullets and action items from both the title and the body; if the body is non-empty, include at least one bullet that reflects concrete content from the body (not only the title).";
  const user = `Note title:\n${input.title}\n\nNote body:\n${input.body}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as StructuredSummary;
  if (!parsed || typeof parsed.title !== "string") {
    throw new Error("Invalid structured summary JSON");
  }
  return parsed;
}
