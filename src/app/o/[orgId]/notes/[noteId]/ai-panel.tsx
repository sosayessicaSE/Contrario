"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { acceptAiSummary, rejectAiSummary } from "@/server/actions/ai";

type SummaryRow = {
  id: string;
  status: "draft" | "accepted" | "rejected";
  model: string;
  outputJson: unknown;
  inputHash: string;
  createdAt: string;
};

function normalizeSummaryRow(row: {
  id: string;
  status: SummaryRow["status"];
  model: string;
  outputJson: unknown;
  inputHash?: string;
  createdAt: string | Date;
}): SummaryRow {
  return {
    id: row.id,
    status: row.status,
    model: row.model,
    outputJson: row.outputJson,
    inputHash: row.inputHash ?? "",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
}

export function AiPanel({
  orgId,
  noteId,
  noteInputHash,
  summaries: serverSummaries,
}: {
  orgId: string;
  noteId: string;
  noteInputHash: string;
  summaries: SummaryRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [verdictPending, setVerdictPending] = useState<null | { summaryId: string; kind: "accept" | "reject" }>(null);
  const [error, setError] = useState<string | null>(null);
  const verdictBusy = verdictPending !== null;
  const [summaries, setSummaries] = useState(serverSummaries);
  const serverKey = useMemo(
    () =>
      `${noteInputHash}|${serverSummaries.map((s) => `${s.id}:${s.status}:${s.inputHash}`).join("|")}`,
    [noteInputHash, serverSummaries],
  );

  // Only resync from the server when the summary set meaningfully changes (avoid wiping optimistic rows on stale RSC props).
  useEffect(() => {
    setSummaries(serverSummaries);
    // serverSummaries is intentionally omitted: new array identity each RSC render would clear optimistic updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  // `router.refresh()` returns before RSC data is ready; keep Accept/Reject loading until props reflect the new status.
  useEffect(() => {
    if (!verdictPending) return;
    const row = serverSummaries.find((x) => x.id === verdictPending.summaryId);
    if (row && row.status !== "draft") {
      setVerdictPending(null);
    }
  }, [serverSummaries, verdictPending]);

  return (
    <div className="stack card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ gap: "0.25rem" }}>
          <h3 style={{ margin: 0 }}>AI summary</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Drafts are snapshots of the note at generation time. After you change the title or body, click{" "}
            <strong>Generate draft</strong> again to refresh.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          disabled={busy || verdictBusy}
          aria-busy={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, noteId }),
                credentials: "same-origin",
              });
              const json = (await res.json().catch(() => ({}))) as {
                error?: string;
                summary?: {
                  id: string;
                  status: SummaryRow["status"];
                  model: string;
                  outputJson: unknown;
                  inputHash: string;
                  createdAt: string | Date;
                };
              };
              if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
              if (json.summary) {
                const item = normalizeSummaryRow(json.summary);
                setSummaries((prev) => (prev.some((p) => p.id === item.id) ? prev : [item, ...prev]));
              }
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="btn-with-spinner">
            {busy ? <LoadingSpinner size="sm" decorative /> : null}
            {busy ? "Generating…" : "Generate draft"}
          </span>
        </button>
      </div>
      {error ? <div className="error small">{error}</div> : null}
      <div className="stack">
        {summaries.length ? (
          summaries.map((s) => {
            const rowVerdictBusy = verdictPending?.summaryId === s.id;
            const otherVerdictBusy = verdictBusy && !rowVerdictBusy;
            return (
            <div key={s.id} className="card stack" style={{ borderStyle: "dashed" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="small muted">
                  {s.status} · {s.model} · {new Date(s.createdAt).toLocaleString()}
                </div>
                {rowVerdictBusy && verdictPending ? (
                  <div className="row" style={{ alignItems: "center", gap: "0.5rem" }} aria-live="polite" aria-busy="true">
                    <LoadingSpinner size="sm" decorative />
                    <span className="small">
                      {verdictPending.kind === "accept" ? "Accepting…" : "Rejecting…"}
                    </span>
                  </div>
                ) : s.status === "draft" ? (
                  <div className="row">
                    <button
                      type="button"
                      disabled={busy || otherVerdictBusy}
                      aria-busy={false}
                      onClick={async () => {
                        setError(null);
                        setVerdictPending({ summaryId: s.id, kind: "accept" });
                        try {
                          await acceptAiSummary(orgId, s.id);
                          router.refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to accept");
                          setVerdictPending(null);
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy || otherVerdictBusy}
                      aria-busy={false}
                      onClick={async () => {
                        setError(null);
                        setVerdictPending({ summaryId: s.id, kind: "reject" });
                        try {
                          await rejectAiSummary(orgId, s.id);
                          router.refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to reject");
                          setVerdictPending(null);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
              {s.inputHash && s.inputHash !== noteInputHash ? (
                <p className="small" style={{ margin: 0, color: "var(--warn, #b8860b)" }}>
                  This draft matches an older version of the note (before your latest save). Use{" "}
                  <strong>Generate draft</strong> again to summarize the current title and body.
                </p>
              ) : null}
              <pre className="small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                {JSON.stringify(s.outputJson, null, 2)}
              </pre>
            </div>
            );
          })
        ) : (
          <div className="muted small">No summaries yet.</div>
        )}
      </div>
    </div>
  );
}
