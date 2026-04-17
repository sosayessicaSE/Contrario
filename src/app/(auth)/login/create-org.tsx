"use client";

import { useState, useTransition } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { createOrganization, joinOrganization } from "@/server/actions/orgs";

export type JoinableOrg = { id: string; name: string; slug: string };

export function CreateOrgForm({ orgs }: { orgs: JoinableOrg[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  return (
    <form
      className="stack card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const pick = String(fd.get("existingOrg") ?? "");
        start(async () => {
          try {
            if (pick) {
              await joinOrganization(pick);
            } else {
              const name = String(fd.get("orgName") ?? "");
              await createOrganization(name);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <label className="stack">
        <span className="small muted">Organization</span>
        <select
          name="existingOrg"
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          aria-label="Join an existing organization or create a new one"
        >
          <option value="">Create a new organization…</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.slug})
            </option>
          ))}
        </select>
      </label>

      {selectedOrgId ? null : (
        <label className="stack">
          <span className="small muted">New organization name</span>
          <input name="orgName" placeholder="Acme Corp" required={!selectedOrgId} disabled={Boolean(selectedOrgId)} />
        </label>
      )}

      {error ? <div className="error small">{error}</div> : null}
      <button className="primary" type="submit" disabled={pending} aria-busy={pending}>
        <span className="btn-with-spinner">
          {pending ? <LoadingSpinner size="sm" decorative /> : null}
          {pending ? "Working…" : selectedOrgId ? "Join organization" : "Create organization"}
        </span>
      </button>
    </form>
  );
}
