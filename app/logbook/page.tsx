import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type Plant,
  groupByCollection,
  collectionIcon,
  shortDate,
} from "@/lib/plants";
import BottomNav from "../components/BottomNav";

export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: false });
  const plants = (data ?? []) as Plant[];
  const groups = groupByCollection(plants).sort((a, b) =>
    a.collection.localeCompare(b.collection),
  );

  return (
    <main className="phone">
      <div className="screen">
        <div className="top-bar">
          <Link className="back-btn" href="/">
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back
          </Link>
          <h1 style={{ marginTop: 10 }}>Logbook</h1>
          <p>Your collections</p>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="ti ti-folder" aria-hidden="true" />
            </div>
            <h3>No collections yet</h3>
            <p>
              Add a plant and sort it into a collection to start organizing your
              sightings.
            </p>
          </div>
        ) : (
          <div className="list-scroll">
            {groups.map((g) => (
              <Link
                key={g.collection}
                href={`/places/${encodeURIComponent(g.collection)}`}
                className="list-item"
              >
                <div className="list-icon">
                  <i
                    className={`ti ${collectionIcon(g.collection)}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="list-text">
                  <h3>{g.collection}</h3>
                  <p>
                    {g.items.length}{" "}
                    {g.items.length === 1 ? "plant" : "plants"}
                    {g.lastAdded ? ` · Last added ${shortDate(g.lastAdded)}` : ""}
                  </p>
                </div>
                <i
                  className="ti ti-chevron-right list-arrow"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        )}

        <BottomNav active="logbook" />
      </div>
    </main>
  );
}
