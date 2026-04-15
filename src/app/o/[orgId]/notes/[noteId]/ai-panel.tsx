"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptAiSummary, rejectAiSummary } from "@/server/actions/ai";

type SummaryRow = {
  id: string;
  status: "draft" | "accepted" | "rejected";
  model: string;
  outputJson: unknown;
  createdAt: string;
};

export function AiPanel({ orgId, noteId, summaries }: { orgId: string; noteId: string; summaries: SummaryRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="stack card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>AI summary</h3>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, noteId }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Generating…" : "Generate draft"}
        </button>
      </div>
      {error ? <div className="error small">{error}</div> : null}
      <div className="stack">
        {summaries.length ? (
          summaries.map((s) => (
            <div key={s.id} className="card stack" style={{ borderStyle: "dashed" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="small muted">
                  {s.status} · {s.model} · {new Date(s.createdAt).toLocaleString()}
                </div>
                {s.status === "draft" ? (
                  <div className="row">
                    <button
                      type="button"
                      onClick={async () => {
                        await acceptAiSummary(orgId, s.id);
                        router.refresh();
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await rejectAiSummary(orgId, s.id);
                        router.refresh();
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
              <pre className="small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                {JSON.stringify(s.outputJson, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div className="muted small">No summaries yet.</div>
        )}
      </div>
    </div>
  );
}
