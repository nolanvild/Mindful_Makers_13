import BottomNav from "../components/BottomNav";

export const dynamic = "force-dynamic";

// Placeholder feed. Real friend sightings need a follow-up (friendships +
// shared visibility); this preserves the team's design with demo data.
const SIGHTINGS = [
  { friend: "Maya Chen", initials: "MC", color: "#D4537E", plant: "Lavender", loc: "San Francisco", time: "2h ago" },
  { friend: "Jordan Lee", initials: "JL", color: "#534AB7", plant: "Coneflower", loc: "Cambridge", time: "5h ago" },
  { friend: "Priya Singh", initials: "PS", color: "#BA7517", plant: "Bird of paradise", loc: "San Francisco", time: "1d ago" },
  { friend: "Sam Okafor", initials: "SO", color: "#1D9E75", plant: "Climbing hydrangea", loc: "Boston", time: "2d ago" },
];

export default function SocialPage() {
  return (
    <main className="phone">
      <div className="screen">
        <div className="top-bar">
          <h1>Social</h1>
          <p>Friends&apos; recent sightings</p>
        </div>

        <div className="list-scroll">
          <p className="demo-note">
            <i className="ti ti-info-circle" aria-hidden="true" /> Demo feed —
            friend connections are coming soon.
          </p>
          {SIGHTINGS.map((s, i) => (
            <div className="sighting-card" key={i}>
              <div className="sighting-head">
                <div
                  className="sighting-avatar"
                  style={{ background: s.color }}
                >
                  {s.initials}
                </div>
                <div className="sighting-who">
                  <h3>{s.friend}</h3>
                  <p>{s.time}</p>
                </div>
              </div>
              <div className="sighting-body">
                <div className="sighting-thumb">
                  <i className="ti ti-plant-2" aria-hidden="true" />
                </div>
                <div className="sighting-info">
                  <h4>{s.plant}</h4>
                  <p>{s.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <BottomNav active="social" />
      </div>
    </main>
  );
}
