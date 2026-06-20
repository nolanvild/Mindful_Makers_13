import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type Plant } from "@/lib/plants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the distinct collections and tag labels the user has already used,
// so the add-plant form can offer them as chips.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data } = await supabase
    .from("plants")
    .select("collections, tags");
  const rows = (data ?? []) as Pick<Plant, "collections" | "tags">[];

  const collections = new Set<string>();
  const tags = new Set<string>();
  for (const r of rows) {
    (r.collections ?? []).forEach((c) => c && collections.add(c));
    (r.tags ?? []).forEach((t) => t?.label && tags.add(t.label));
  }

  return NextResponse.json({
    collections: Array.from(collections).sort(),
    tags: Array.from(tags).sort(),
  });
}
