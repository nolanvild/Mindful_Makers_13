// Shared plant types and helpers used across server and client components.

export type Tone = "green" | "pink" | "amber" | "purple";

export interface Tag {
  label: string;
  tone: Tone;
}

export interface Plant {
  id: string;
  user_id: string;
  name: string;
  scientific_name: string | null;
  collections: string[];
  about: string | null;
  care: string | null;
  tags: Tag[];
  photo_path: string | null;
  photo_url: string | null;
  confidence: string | null;
  created_at: string;
}

export const TONE_PALETTE: Tone[] = ["green", "pink", "amber", "purple"];

// Tags offered as chips by default in the add-plant form.
export const BASE_TAGS = [
  "Perennial",
  "Annual",
  "Pollinator",
  "Native",
  "Fragrant",
  "Drought-tolerant",
  "Climber",
  "Shade-tolerant",
];

// Maps a tag tone to the CSS class defined in globals.css.
export function toneClass(tone: Tone): string {
  switch (tone) {
    case "pink":
      return "tag-pink";
    case "amber":
      return "tag-amber";
    case "purple":
      return "tag-purple";
    case "green":
    default:
      return "tag-green";
  }
}

// Stable tone for an arbitrary tag label (so custom tags get a consistent color).
export function toneForLabel(label: string): Tone {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return TONE_PALETTE[Math.abs(hash) % TONE_PALETTE.length];
}

// Picks a Tabler icon name for a collection card in the Logbook.
export function collectionIcon(name: string): string {
  const l = name.toLowerCase();
  if (l.includes("cambridge")) return "ti-building-arch";
  if (l.includes("san fran") || l.includes("francisco")) return "ti-bridge";
  if (l.includes("boston")) return "ti-building";
  if (l.includes("rose") || l.includes("flower")) return "ti-flower";
  return "ti-folder";
}

const UNSORTED = "Unsorted";

// Groups plants by collection. A plant in several collections appears in each.
export function groupByCollection(plants: Plant[]) {
  const groups = new Map<string, Plant[]>();
  for (const p of plants) {
    const cols = p.collections?.length ? p.collections : [UNSORTED];
    for (const c of cols) {
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(p);
    }
  }
  return Array.from(groups.entries()).map(([collection, items]) => ({
    collection,
    items,
    lastAdded: items[0]?.created_at ?? null,
  }));
}

// "Jun 18" style short date.
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
