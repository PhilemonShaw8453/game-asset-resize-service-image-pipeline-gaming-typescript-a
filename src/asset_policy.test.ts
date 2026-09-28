import assert from "node:assert/strict";
import test from "node:test";
import { assetUploadSchema, planAsset } from "./asset_policy.js";

test("a live event banner enters the urgent event moderation queue", () => {
  const upload = assetUploadSchema.parse({
    assetId: "asset-42",
    playerId: "player-7",
    eventId: "launch-night",
    kind: "live_event_banner",
    filename: "arena.png",
    contentType: "image/png",
    dataBase64: "aGVsbG8=",
  });

  assert.deepEqual(planAsset(upload), {
    width: 1600,
    height: 900,
    queue: "live-event-review",
    priority: "urgent",
    state: "pending_moderation",
  });
});

test("an event banner without an event is rejected at the request boundary", () => {
  const result = assetUploadSchema.safeParse({
    assetId: "asset-42",
    playerId: "player-7",
    kind: "live_event_banner",
    filename: "arena.png",
    contentType: "image/png",
    dataBase64: "aGVsbG8=",
  });
  assert.equal(result.success, false);
});
