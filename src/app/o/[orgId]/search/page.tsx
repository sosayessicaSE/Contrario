import { searchNotes } from "@/server/actions/notes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await params;
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";

  const results = q.trim() ? await searchNotes(orgId, q.trim(), 50) : [];

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Search</h1>
      <form className="row">
        <input name="q" defaultValue={q} placeholder="Search titles, body, tags…" style={{ flex: 1, minWidth: 240 }} />
        <button className="primary" type="submit">
          Search
        </button>
      </form>
      <div className="muted small">Results respect org boundaries and note visibility rules.</div>
      <div className="stack">
        {results.length ? (
          results.map((r) => (
            <Link key={r.id} href={`/o/${orgId}/notes/${r.id}`} className="card" style={{ textDecoration: "none" }}>
              <div style={{ fontWeight: 700 }}>{r.title || "(untitled)"}</div>
              <div className="small muted">{r.visibility}</div>
              <div className="small" style={{ opacity: 0.85 }}>
                {(r.body ?? "").slice(0, 220)}
                {(r.body ?? "").length > 220 ? "…" : ""}
              </div>
            </Link>
          ))
        ) : (
          <div className="muted">{q.trim() ? "No results." : "Enter a query."}</div>
        )}
      </div>
    </div>
  );
}
