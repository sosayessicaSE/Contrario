"use client";

import { useState } from "react";

export function DownloadButton({ orgId, fileId }: { orgId: string; fileId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="stack">
      <button
        type="button"
        onClick={async () => {
          setMsg(null);
          const res = await fetch("/api/files/sign-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, fileId }),
          });
          const json = await res.json();
          if (!res.ok) setMsg(json.error ?? "failed");
          else window.open(json.signedUrl, "_blank", "noopener,noreferrer");
        }}
      >
        Download
      </button>
      {msg ? <div className="error small">{msg}</div> : null}
    </div>
  );
}
