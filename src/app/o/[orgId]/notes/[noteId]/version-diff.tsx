"use client";

import { diffWords } from "diff";
import { useMemo, useState } from "react";

export function VersionDiff({
  versions,
}: {
  versions: Array<{ id: string; title: string; body: string; createdAt: string }>;
}) {
  const sorted = useMemo(() => [...versions].reverse(), [versions]);
  const [aIdx, setAIdx] = useState(Math.max(0, sorted.length - 2));
  const [bIdx, setBIdx] = useState(Math.max(0, sorted.length - 1));

  const a = sorted[aIdx];
  const b = sorted[bIdx];
  const parts = useMemo(() => {
    if (!a || !b) return [];
    return diffWords(`${a.title}\n${a.body}`, `${b.title}\n${b.body}`);
  }, [a, b]);

  if (sorted.length < 2) {
    return <div className="muted small">Create edits to see diffs between versions.</div>;
  }

  return (
    <div className="stack">
      <div className="row">
        <label className="stack small">
          <span className="muted">From</span>
          <select value={aIdx} onChange={(e) => setAIdx(Number(e.target.value))}>
            {sorted.map((v, idx) => (
              <option key={v.id} value={idx}>
                {new Date(v.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="stack small">
          <span className="muted">To</span>
          <select value={bIdx} onChange={(e) => setBIdx(Number(e.target.value))}>
            {sorted.map((v, idx) => (
              <option key={v.id} value={idx}>
                {new Date(v.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          padding: "0.75rem",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "#0b1020",
        }}
      >
        {parts.map((p, i) => (
          <span
            key={i}
            style={{
              background: p.added ? "rgba(62, 207, 142, 0.25)" : p.removed ? "rgba(232, 93, 93, 0.25)" : "transparent",
              textDecoration: p.removed ? "line-through" : "none",
            }}
          >
            {p.value}
          </span>
        ))}
      </pre>
    </div>
  );
}
