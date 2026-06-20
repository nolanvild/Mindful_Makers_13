import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Plant, type Tag, toneClass } from "@/lib/plants";
import BottomNav from "../../components/BottomNav";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: raw } = await params;
  const collection = decodeURIComponent(raw);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plants")
    .select("*")
    .contains("collections", [collection])
    .order("created_at", { ascending: false });
  const plants = (data ?? []) as Plant[];

  return (
    <main className="phone">
      <div className="screen">
        <div className="top-bar">
          <Link className="back-btn" href="/logbook">
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Logbook
          </Link>
          <h1 style={{ marginTop: 10 }}>{collection}</h1>
          <p>
            {plants.length} {plants.length === 1 ? "plant" : "plants"}
          </p>
        </div>

        <div className="list-scroll">
          {plants.map((p) => (
            <Link key={p.id} href={`/plant/${p.id}`} className="plant-row">
              <div className="plant-thumb">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} />
                ) : (
                  <i className="ti ti-plant-2" aria-hidden="true" />
                )}
              </div>
              <div className="plant-info">
                <h3>{p.name}</h3>
                {p.scientific_name && <p className="sci">{p.scientific_name}</p>}
                <div className="tags-inline">
                  {(p.tags as Tag[]).slice(0, 2).map((t, i) => (
                    <span key={i} className={`tag ${toneClass(t.tone)}`}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
              <i
                className="ti ti-chevron-right"
                style={{ color: "var(--text-secondary)", fontSize: 18 }}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>

        <BottomNav active="logbook" />
      </div>
    </main>
  );
}
