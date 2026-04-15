"use client";

import { useRouter } from "next/navigation";

export function OrgSwitcherClient({
  currentOrgId,
  orgs,
}: {
  currentOrgId: string;
  orgs: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  return (
    <select value={currentOrgId} onChange={(e) => router.push(`/o/${e.target.value}/notes`)} style={{ minWidth: 220 }}>
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
