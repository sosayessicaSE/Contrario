import { redirectToDefaultAppDestination } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Alias for `/` — useful if Supabase or bookmarks use `/dashboard`. */
export default async function DashboardPage() {
  await redirectToDefaultAppDestination();
}
