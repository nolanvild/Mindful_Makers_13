"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_TAGS, type Tag, type Tone, toneForLabel } from "@/lib/plants";

type Step = "choose" | "camera" | "preview" | "identifying" | "review" | "saving";

interface Identification {
  isPlant: boolean;
  name: string;
  scientificName: string;
  tags: Tag[];
  about: string;
  care: string;
  confidence: "high" | "medium" | "low";
}

export default function AddPlantSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("choose");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [camError, setCamError] = useState("");
  const [error, setError] = useState("");

  // Review-form state.
  const [ident, setIdent] = useState<Identification | null>(null);
  const [name, setName] = useState("");
  const [knownCollections, setKnownCollections] = useState<string[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  // Tone per tag label (AI tags carry their own tone; others are derived).
  const toneByLabel = useRef<Map<string, Tone>>(new Map());

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setStep("choose");
    setDataUrl(null);
    setCamError("");
    setError("");
    setIdent(null);
    setName("");
    setSelectedCollections(new Set());
    setSelectedTags(new Set());
    toneByLabel.current = new Map();
  }, [stopStream]);

  useEffect(() => {
    if (!open) reset();
    return () => stopStream();
  }, [open, reset, stopStream]);

  // Load the user's existing collections/tags for chip suggestions.
  useEffect(() => {
    if (!open) return;
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : { collections: [], tags: [] }))
      .then((j) => {
        setKnownCollections(j.collections ?? []);
        setKnownTags(j.tags ?? []);
      })
      .catch(() => {});
  }, [open]);

  async function startCamera() {
    setStep("camera");
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCamError(
        "Could not access the camera. Check permissions, or upload a photo instead.",
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    stopStream();
    setStep("preview");
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(reader.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
  }

  // Run AI identification, then open the editable review form.
  async function identify() {
    if (!dataUrl) return;
    setStep("identifying");
    setError("");
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setStep("preview");
        return;
      }
      const id = json.identification as Identification;
      setIdent(id);
      setName(id.isPlant ? id.name : "");
      // Seed tag tones + preselect the AI's suggested tags.
      const tones = new Map<string, Tone>();
      const preselected = new Set<string>();
      for (const t of id.tags ?? []) {
        tones.set(t.label, t.tone);
        preselected.add(t.label);
      }
      toneByLabel.current = tones;
      setSelectedTags(preselected);
      setStep("review");
    } catch {
      setError("Network error. Please try again.");
      setStep("preview");
    }
  }

  function toggle(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function addCustomCollection() {
    const v = (window.prompt("New collection name:") || "").trim();
    if (!v) return;
    setKnownCollections((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setSelectedCollections((prev) => new Set(prev).add(v));
  }

  function addCustomTag() {
    const v = (window.prompt("New tag name:") || "").trim();
    if (!v) return;
    if (!toneByLabel.current.has(v)) toneByLabel.current.set(v, toneForLabel(v));
    setKnownTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setSelectedTags((prev) => new Set(prev).add(v));
  }

  async function savePlant() {
    if (!dataUrl || !ident) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please give your plant a name.");
      return;
    }
    setStep("saving");
    setError("");

    const tags: Tag[] = Array.from(selectedTags).map((label) => ({
      label,
      tone: toneByLabel.current.get(label) ?? toneForLabel(label),
    }));

    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          name: trimmed,
          scientificName: ident.scientificName,
          about: ident.about,
          care: ident.care,
          confidence: ident.confidence,
          collections: Array.from(selectedCollections),
          tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save.");
        setStep("review");
        return;
      }
      onClose();
      reset();
      router.push(`/plant/${json.plant.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setStep("review");
    }
  }

  // Collection chips = user's existing collections + any just-added.
  const collectionChips = knownCollections;
  // Tag chips = base tags ∪ AI tags ∪ known/custom tags.
  const tagChips = Array.from(
    new Set([...BASE_TAGS, ...Array.from(selectedTags), ...knownTags]),
  );

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        {step === "choose" && (
          <>
            <h3>Add a plant</h3>
            <p>
              Take a photo or upload one — AI will identify the species, then you
              can tweak the details before saving.
            </p>
            <div className="modal-actions">
              <button className="modal-action-btn" onClick={startCamera}>
                <i className="ti ti-camera" aria-hidden="true" />
                Take photo
              </button>
              <button
                className="modal-action-btn"
                onClick={() => uploadRef.current?.click()}
              >
                <i className="ti ti-photo-up" aria-hidden="true" />
                Upload photo
              </button>
            </div>
            <button className="modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onUpload}
            />
          </>
        )}

        {step === "camera" && (
          <div className="camera-view">
            <h3>Take a photo</h3>
            {camError ? (
              <div className="camera-error">{camError}</div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted />
            )}
            <div className="capture-row">
              <button
                className="camera-back-btn"
                onClick={() => {
                  stopStream();
                  setStep("choose");
                }}
              >
                Cancel
              </button>
              {!camError && (
                <button
                  className="shutter-btn"
                  aria-label="Capture photo"
                  onClick={capturePhoto}
                />
              )}
            </div>
          </div>
        )}

        {step === "preview" && dataUrl && (
          <div className="camera-view">
            <h3>Use this photo?</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="preview-img" src={dataUrl} alt="Captured plant" />
            {error && <div className="camera-error">{error}</div>}
            <div className="preview-actions">
              <button
                className="btn-retake"
                onClick={() => {
                  setDataUrl(null);
                  setError("");
                  setStep("choose");
                }}
              >
                Retake
              </button>
              <button className="btn-use" onClick={identify}>
                Identify
              </button>
            </div>
          </div>
        )}

        {step === "identifying" && (
          <div className="identifying">
            <div className="spinner" />
            <p>Identifying your plant…</p>
          </div>
        )}

        {step === "review" && ident && (
          <div className="info-form">
            <h3>Plant details</h3>
            {!ident.isPlant && (
              <p style={{ color: "#c0392b" }}>
                We couldn&apos;t confidently spot a plant — add the details yourself.
              </p>
            )}

            <div className="info-field">
              <label htmlFor="info-name">Plant name</label>
              <input
                id="info-name"
                type="text"
                placeholder="e.g. Red rose"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {ident.scientificName && (
                <p
                  style={{
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "var(--text-secondary)",
                    marginTop: 6,
                  }}
                >
                  {ident.scientificName} · AI · {ident.confidence} confidence
                </p>
              )}
            </div>

            <div className="info-field">
              <label>Collections</label>
              <div className="chip-list">
                {collectionChips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip-toggle${selectedCollections.has(c) ? " selected" : ""}`}
                    onClick={() =>
                      toggle(selectedCollections, c, setSelectedCollections)
                    }
                  >
                    {c}
                  </button>
                ))}
                <button type="button" className="chip-add" onClick={addCustomCollection}>
                  + New
                </button>
              </div>
            </div>

            <div className="info-field">
              <label>Tags</label>
              <div className="chip-list">
                {tagChips.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip-toggle${selectedTags.has(t) ? " selected" : ""}`}
                    onClick={() => toggle(selectedTags, t, setSelectedTags)}
                  >
                    {t}
                  </button>
                ))}
                <button type="button" className="chip-add" onClick={addCustomTag}>
                  + New
                </button>
              </div>
            </div>

            {ident.about && (
              <div className="info-field">
                <label>AI notes</label>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {ident.about}
                </p>
              </div>
            )}

            {error && <div className="camera-error">{error}</div>}

            <div className="info-actions">
              <button className="btn-retake" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-use" onClick={savePlant}>
                Save plant
              </button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="identifying">
            <div className="spinner" />
            <p>Saving…</p>
          </div>
        )}
      </div>
    </div>
  );
}
