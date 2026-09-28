import { z } from "zod";

export const assetUploadSchema = z.object({
  assetId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  playerId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  eventId: z.string().regex(/^[a-z0-9-]{1,64}$/).optional(),
  kind: z.enum(["avatar", "live_event_banner", "world_snapshot"]),
  filename: z.string().regex(/^[a-zA-Z0-9._-]{1,120}$/),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(4).max(14_000_000),
}).strict().superRefine((value, context) => {
  if (value.kind === "live_event_banner" && !value.eventId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["eventId"], message: "eventId is required for a live event banner" });
  }
});

export type AssetUpload = z.infer<typeof assetUploadSchema>;

export type AssetPlan = {
  width: number;
  height: number;
  queue: "player-safety" | "live-event-review";
  priority: "normal" | "urgent";
  state: "pending_moderation";
};

export function planAsset(input: AssetUpload): AssetPlan {
  if (input.kind === "live_event_banner") {
    return { width: 1600, height: 900, queue: "live-event-review", priority: "urgent", state: "pending_moderation" };
  }
  if (input.kind === "avatar") {
    return { width: 512, height: 512, queue: "player-safety", priority: "normal", state: "pending_moderation" };
  }
  return { width: 1280, height: 720, queue: "player-safety", priority: "normal", state: "pending_moderation" };
}

export function objectKey(input: AssetUpload): string {
  const scope = input.eventId ? `events/${input.eventId}` : `players/${input.playerId}`;
  return `${scope}/originals/${input.assetId}-${input.filename}`;
}
