import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type Tag, type Tone, TONE_PALETTE } from "@/lib/plants";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "plant-photos";
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED)[number];

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mediaType = match[1];
  if (!ALLOWED.includes(mediaType as AllowedType)) return null;
  return { mediaType: mediaType as AllowedType, base64: match[2] };
}

interface SaveBody {
  imageDataUrl?: string;
  name?: string;
  scientificName?: string;
  about?: string;
  care?: string;
  collections?: string[];
  tags?: Tag[];
  confidence?: string;
}

const VALID_TONES = new Set<Tone>(TONE_PALETTE);

// Saves a reviewed plant: uploads the photo to storage and inserts the row.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "A plant name is required." }, { status: 400 });
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

  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.byteLength > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  // Sanitize inputs.
  const collections = Array.from(
    new Set((body.collections ?? []).map((c) => c.trim()).filter(Boolean)),
  );
  const tags: Tag[] = (body.tags ?? [])
    .filter((t) => t && typeof t.label === "string" && t.label.trim())
    .map((t) => ({
      label: t.label.trim(),
      tone: VALID_TONES.has(t.tone) ? t.tone : "green",
    }));

  // 1. Upload the photo under the user's folder.
  const ext = parsed.mediaType.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: parsed.mediaType, upsert: false });
  if (uploadError) {
    console.error("upload error", uploadError);
    return NextResponse.json(
      { error: "Could not save the photo." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // 2. Insert the plant row (RLS scopes it to the user).
  const { data: plant, error: insertError } = await supabase
    .from("plants")
    .insert({
      user_id: user.id,
      name,
      scientific_name: body.scientificName?.trim() || null,
      collections,
      about: body.about?.trim() || null,
      care: body.care?.trim() || null,
      tags,
      photo_path: path,
      photo_url: publicUrl,
      confidence: body.confidence ?? null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("insert error", insertError);
    return NextResponse.json(
      { error: "Could not save the plant." },
      { status: 500 },
    );
  }

  return NextResponse.json({ plant }, { status: 201 });
}
