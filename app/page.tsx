import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Plant, shortDate } from "@/lib/plants";
import BottomNav from "./components/BottomNav";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: false });
  const plants = (data ?? []) as Plant[];

  const season = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="phone">
      <div className="screen">
        <div className="top-bar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/branchout.png" alt="Branch Out" />
          <div className="top-row">
            <div>
              <h1>Planting season</h1>
              <p>
                {season} · {plants.length}{" "}
                {plants.length === 1 ? "sighting" : "sightings"}
              </p>
            </div>
            <div className="top-actions">
              <Link className="add-btn" href="/logbook">
                <i className="ti ti-books" aria-hidden="true" />
                Logbook
              </Link>
              <form action="/auth/signout" method="post">
                <button className="icon-btn" type="submit" aria-label="Sign out">
                  <i className="ti ti-logout" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {plants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="ti ti-plant-2" aria-hidden="true" />
            </div>
            <h3>No plants yet</h3>
            <p>
              Tap the camera button below to photograph your first plant. AI
              will identify the species and start your logbook.
            </p>
          </div>
        ) : (
          <div className="photo-grid">
            {plants.map((p) => (
              <Link key={p.id} href={`/plant/${p.id}`} className="photo-card">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} />
                ) : (
                  <span className="placeholder-icon">
                    <i className="ti ti-plant-2" aria-hidden="true" />
                  </span>
                )}
                <div className="photo-label">
                  <span>{p.name}</span>
                  <small>
                    {p.collections?.[0] ? `${p.collections[0]} · ` : ""}
                    {shortDate(p.created_at)}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        )}

        <BottomNav active="home" />
      </div>
    </main>
  );
}
