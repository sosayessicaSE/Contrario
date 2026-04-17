"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export function DownloadButton({ orgId, fileId, filename }: { orgId: string; fileId: string; filename: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="stack">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const res = await fetch("/api/files/sign-download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ orgId, fileId }),
            });
            const json = (await res.json()) as { error?: string; signedUrl?: string };
            if (!res.ok) throw new Error(json.error ?? "failed");

            const fileRes = await fetch(json.signedUrl!);
            if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);

            const blob = await fileRes.blob();
            const objectUrl = URL.createObjectURL(blob);
            const safeName = filename.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 200) || "download";
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = safeName;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="btn-with-spinner">
          {busy ? <LoadingSpinner size="sm" decorative /> : null}
          {busy ? "Downloading…" : "Download"}
        </span>
      </button>
      {msg ? <div className="error small">{msg}</div> : null}
    </div>
  );
}
