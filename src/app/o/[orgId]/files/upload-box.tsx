"use client";

import { LoadingSpinner } from "@/components/loading-spinner";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UploadBox({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Upload</h2>
      <div className="small muted">Org-scoped uploads (max 15MB).</div>
      {busy ? (
        <div className="row" role="status" aria-live="polite" style={{ alignItems: "center" }}>
          <LoadingSpinner size="sm" label="Uploading file" />
          <span className="small muted">Uploading…</span>
        </div>
      ) : null}
      <input
        type="file"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMsg(null);
          try {
            const sign = await fetch("/api/files/sign-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orgId,
                noteId: null,
                filename: file.name,
                mime: file.type || "application/octet-stream",
                size: file.size,
              }),
            });
            const su = await sign.json();
            if (!sign.ok) throw new Error(su.error ?? `sign failed (${sign.status})`);

            const put = await fetch(su.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": file.type || "application/octet-stream",
                ...(su.token ? { Authorization: `Bearer ${su.token}` } : {}),
              },
              body: file,
            });
            if (!put.ok) throw new Error(`upload failed (${put.status})`);

            const done = await fetch("/api/files/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgId, fileId: su.fileId }),
            });
            const dj = await done.json();
            if (!done.ok) throw new Error(dj.error ?? `complete failed (${done.status})`);

            router.refresh();
            setMsg("Uploaded");
            e.target.value = "";
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      {msg ? <div className="small">{msg}</div> : null}
    </div>
  );
}
