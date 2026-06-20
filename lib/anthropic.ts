import Anthropic from "@anthropic-ai/sdk";
import type { Tag } from "@/lib/plants";

export interface Identification {
  isPlant: boolean;
  name: string;
  scientificName: string;
  tags: Tag[];
  about: string;
  care: string;
  confidence: "high" | "medium" | "low";
}

// JSON schema for the forced tool call. Using a forced tool (rather than a
// free-text reply) guarantees Claude returns structured, parseable fields.
const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    isPlant: {
      type: "boolean",
      description: "True if the image clearly contains a plant or flower.",
    },
    name: {
      type: "string",
      description: 'Common name, e.g. "Red rose". "Unknown" if not a plant.',
    },
    scientificName: {
      type: "string",
      description: 'Latin/botanical name, e.g. "Rosa rubiginosa". Empty if unknown.',
    },
    tags: {
      type: "array",
      description: "2-4 short descriptive tags.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: 'e.g. "Perennial", "Fragrant"' },
          tone: {
            type: "string",
            enum: ["green", "pink", "amber", "purple"],
          },
        },
        required: ["label", "tone"],
      },
    },
    about: {
      type: "string",
      description: "2-3 sentence description of the plant.",
    },
    care: {
      type: "string",
      description: "2-3 sentence care guide (light, water, soil, pruning).",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["isPlant", "name", "scientificName", "tags", "about", "care", "confidence"],
};

export async function identifyPlant(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<Identification> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    tools: [
      {
        name: "record_identification",
        description:
          "Record the identification of the plant shown in the photo.",
        input_schema: TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_identification" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text:
              "Identify the plant or flower in this photo. Provide its common " +
              "name, scientific name, descriptive tags, a short about blurb, and " +
              "care notes. If the image does not clearly show a plant, set " +
              "isPlant to false.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a structured identification.");
  }

  // Tool inputs are already parsed objects in the SDK.
  return toolUse.input as Identification;
}
