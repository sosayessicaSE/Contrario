import Link from "next/link";
import { listNotesForOrg, createNote } from "@/server/actions/notes";
import { requireAuthContext } from "@/server/actions/context";

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await requireAuthContext(orgId);
  const items = await listNotesForOrg(orgId);

  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const body = String(formData.get("body") ?? "");
    const visibility = (String(formData.get("visibility") ?? "org") as "org" | "private" | "shared");
    const tagNames = String(formData.get("tags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await createNote(orgId, { title, body, visibility, tagNames });
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Notes</h1>
      <div className="card stack">
        <h2 style={{ margin: 0 }}>New note</h2>
        <form action={create} className="stack">
          <input name="title" placeholder="Title" required />
          <textarea name="body" placeholder="Body (markdown-ish plain text)" rows={6} />
          <label className="row">
            <span className="small muted">Visibility</span>
            <select name="visibility" defaultValue="org">
              <option value="org">Org</option>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          <input name="tags" placeholder="Tags (comma-separated)" />
          <button className="primary" type="submit">
            Create
          </button>
        </form>
      </div>

      <div className="stack">
        {items.length ? (
          items.map((n) => (
            <Link key={n.id} href={`/o/${orgId}/notes/${n.id}`} className="card" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{n.title || "(untitled)"}</div>
                  <div className="small muted">
                    {n.visibility} · updated {new Date(n.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="muted">No notes yet.</div>
        )}
      </div>
    </div>
  );
}
