import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNote, getNoteDetail, setNoteShares, updateNote } from "@/server/actions/notes";
import { listOrgMembers } from "@/server/actions/orgs";
import { VersionDiff } from "./version-diff";
import { AiPanel } from "./ai-panel";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ orgId: string; noteId: string }> }) {
  const { orgId, noteId } = await params;
  const detail = await getNoteDetail(orgId, noteId);
  if (!detail) notFound();

  const members = await listOrgMembers(orgId);

  async function save(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const body = String(formData.get("body") ?? "");
    const visibility = String(formData.get("visibility") ?? "org") as "org" | "private" | "shared";
    const tagNames = String(formData.get("tags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await updateNote(orgId, noteId, { title, body, visibility, tagNames });
  }

  async function remove() {
    "use server";
    await deleteNote(orgId, noteId);
  }

  async function saveShares(formData: FormData) {
    "use server";
    const ids = formData.getAll("shareUser").map(String);
    await setNoteShares(orgId, noteId, ids);
  }

  const versions = detail.versions.map((v) => ({
    id: v.id,
    title: v.title,
    body: v.body,
    createdAt: v.createdAt.toISOString(),
  }));

  const summaries = detail.summaries.map((s) => ({
    id: s.id,
    status: s.status,
    model: s.model,
    outputJson: s.outputJson,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href={`/o/${orgId}/notes`} className="small">
          ← Back
        </Link>
        <form action={remove}>
          <button type="submit" className="error" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            Delete
          </button>
        </form>
      </div>

      <div className="card stack">
        <h1 style={{ margin: 0 }}>Edit note</h1>
        <form action={save} className="stack">
          <input name="title" defaultValue={detail.note.title} required />
          <textarea name="body" rows={10} defaultValue={detail.note.body} />
          <label className="row">
            <span className="small muted">Visibility</span>
            <select name="visibility" defaultValue={detail.note.visibility}>
              <option value="org">Org</option>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          <input name="tags" defaultValue={detail.tagNames.join(", ")} placeholder="Tags (comma-separated)" />
          <button className="primary" type="submit">
            Save
          </button>
        </form>
      </div>

      {detail.note.visibility === "shared" ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Share with members</h2>
          <form action={saveShares} className="stack">
            {members
              .filter((m) => m.userId !== detail.note.createdBy)
              .map((m) => (
                <label key={m.userId} className="row">
                  <input type="checkbox" name="shareUser" value={m.userId} defaultChecked={detail.shares.includes(m.userId)} />
                  <span className="small">
                    {(m.displayName ?? m.userId).toString()} <span className="muted">({m.role})</span>
                  </span>
                </label>
              ))}
            <button type="submit">Update shares</button>
          </form>
        </div>
      ) : null}

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Versions</h2>
        <div className="stack">
          {detail.versions.length ? (
            detail.versions.map((v) => (
              <div key={v.id} className="small muted">
                {new Date(v.createdAt).toLocaleString()} · editor {v.editedBy} · tags{" "}
                {Array.isArray(v.tagsSnapshot) ? (v.tagsSnapshot as string[]).join(", ") : ""}
              </div>
            ))
          ) : (
            <div className="muted small">No versions yet (versions are recorded on each save).</div>
          )}
        </div>
        <VersionDiff versions={versions} />
      </div>

      <AiPanel orgId={orgId} noteId={noteId} summaries={summaries} />
    </div>
  );
}
