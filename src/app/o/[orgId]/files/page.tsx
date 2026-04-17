import { listOrgFiles } from "@/server/actions/files";
import { UploadBox } from "./upload-box";
import { DownloadButton } from "./download-button";
import { OrgMainInset } from "../org-main-inset";

export const dynamic = "force-dynamic";

export default async function FilesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const files = await listOrgFiles(orgId);

  return (
    <OrgMainInset>
      <div className="stack">
      <h1 style={{ margin: 0 }}>Files</h1>
      <UploadBox orgId={orgId} />

      <div className="stack">
        {files.length ? (
          files.map((f) => (
            <div key={f.id} className="card stack">
              <div style={{ fontWeight: 700 }}>{f.filename}</div>
              <div className="small muted">
                {f.status} · {f.mime} · {f.size} bytes · note {f.noteId ?? "—"}
              </div>
              {f.status === "ready" ? <DownloadButton orgId={orgId} fileId={f.id} filename={f.filename} /> : null}
            </div>
          ))
        ) : (
          <div className="muted">No files yet.</div>
        )}
      </div>
      </div>
    </OrgMainInset>
  );
}
