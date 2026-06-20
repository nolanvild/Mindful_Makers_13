import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { identifyPlant } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED)[number];

// Parses a "data:image/jpeg;base64,...." URL into its parts.
function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mediaType = match[1];
  if (!ALLOWED.includes(mediaType as AllowedType)) return null;
  return { mediaType: mediaType as AllowedType, base64: match[2] };
}

// Identifies the plant in a photo with Claude vision. Does NOT save anything —
// the client reviews/edits the suggestion, then POSTs to /api/plants to save.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.imageDataUrl) {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }

  const parsed = parseDataUrl(body.imageDataUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Unsupported image format." },
      { status: 400 },
    );
  }

  if (Buffer.from(parsed.base64, "base64").byteLength > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  try {
    const ident = await identifyPlant(parsed.base64, parsed.mediaType);
    return NextResponse.json({ identification: ident });
  } catch (err) {
    console.error("identify error", err);
    return NextResponse.json(
      { error: "Identification failed. Please try again." },
      { status: 502 },
    );
  }
}
