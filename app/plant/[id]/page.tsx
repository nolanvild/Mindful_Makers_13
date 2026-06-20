import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Plant, type Tag, toneClass } from "@/lib/plants";

export const dynamic = "force-dynamic";

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("plants")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const plant = data as Plant;

  async function deletePlant() {
    "use server";
    const supabase = await createClient();
    if (plant.photo_path) {
      await supabase.storage.from("plant-photos").remove([plant.photo_path]);
    }
    await supabase.from("plants").delete().eq("id", plant.id);
    revalidatePath("/");
    redirect("/");
  }

  const confidence = plant.confidence
    ? plant.confidence[0].toUpperCase() + plant.confidence.slice(1)
    : null;

  return (
    <main className="phone">
      <div className="screen">
        <div className="top-bar" style={{ paddingBottom: 8 }}>
          <div className="top-row">
            <Link className="back-btn" href="/">
              <i className="ti ti-arrow-left" aria-hidden="true" />
              Back
            </Link>
            <form action={deletePlant}>
              <button className="icon-btn" type="submit" aria-label="Delete plant">
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>

        <div className="detail-hero">
          {plant.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plant.photo_url} alt={plant.name} />
          ) : (
            <span className="placeholder-icon">
              <i className="ti ti-plant-2" aria-hidden="true" />
            </span>
          )}
          <span className="identified-badge">
            <i
              className="ti ti-sparkles"
              aria-hidden="true"
              style={{ fontSize: 12, verticalAlign: -1, marginRight: 3 }}
            />
            AI Identified{confidence ? ` · ${confidence}` : ""}
          </span>
        </div>

        <div className="detail-body">
          <h2>{plant.name}</h2>
          {plant.scientific_name && (
            <p className="sci-name">{plant.scientific_name}</p>
          )}

          {plant.tags.length > 0 && (
            <div className="detail-tags">
              {(plant.tags as Tag[]).map((t, i) => (
                <span key={i} className={`tag ${toneClass(t.tone)}`}>
                  {t.label}
                </span>
              ))}
            </div>
          )}

          {plant.collections?.length > 0 && (
            <div className="detail-section">
              <h4>Collections</h4>
              <div className="detail-tags">
                {plant.collections.map((c) => (
                  <Link
                    key={c}
                    href={`/places/${encodeURIComponent(c)}`}
                    className="tag tag-green"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {plant.about && (
            <div className="detail-section">
              <h4>About</h4>
              <p>{plant.about}</p>
            </div>
          )}

          {plant.care && (
            <div className="detail-section">
              <h4>Care notes</h4>
              <p>{plant.care}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
