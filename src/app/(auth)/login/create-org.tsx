"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/server/actions/orgs";

export function CreateOrgForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="stack card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("orgName") ?? "");
        start(async () => {
          try {
            await createOrganization(name);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <label className="stack">
        <span className="small muted">Organization name</span>
        <input name="orgName" placeholder="Acme Corp" required />
      </label>
      {error ? <div className="error small">{error}</div> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
