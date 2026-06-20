"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AddPlantSheet from "./AddPlantSheet";

type Active = "home" | "logbook" | "places" | "social";

export default function BottomNav({ active }: { active: Active }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="bottom-nav">
        <button
          className={`nav-btn${active === "home" ? " active" : ""}`}
          onClick={() => router.push("/")}
        >
          <i className="ti ti-layout-grid" aria-hidden="true" />
          Home
        </button>
        <button
          className={`nav-btn${active === "logbook" ? " active" : ""}`}
          onClick={() => router.push("/logbook")}
        >
          <i className="ti ti-books" aria-hidden="true" />
          Logbook
        </button>
        <div className="cam-wrap">
          <button
            className="cam-btn"
            aria-label="Add a plant"
            onClick={() => setSheetOpen(true)}
          >
            <i className="ti ti-camera" aria-hidden="true" />
          </button>
        </div>
        <button
          className={`nav-btn${active === "places" ? " active" : ""}`}
          onClick={() => router.push("/logbook")}
        >
          <i className="ti ti-map-pin" aria-hidden="true" />
          Places
        </button>
        <button
          className={`nav-btn${active === "social" ? " active" : ""}`}
          onClick={() => router.push("/social")}
        >
          <i className="ti ti-users" aria-hidden="true" />
          Social
        </button>
      </nav>

      <AddPlantSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
