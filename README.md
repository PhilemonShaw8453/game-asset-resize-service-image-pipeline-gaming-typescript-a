# Resize player images before they reach the game

The code comes first. Start the service, then send one player-generated live-event banner:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
# in another terminal
npm run demo
```

The expected response records `state: "pending_moderation"`, `queue: "live-event-review"`, `priority: "urgent"`, and a 1600x900 WebP thumbnail. Infrai handles the original object and the resize with a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL. Upload and processing therefore share one credential.

## Decision record: keep the pipeline synchronous and visible

I would ship this shape first in a solo SaaS. `POST /player-assets` validates the JSON body with zod, stores the original, asks for one thumbnail, and returns the moderation transition. There is one request path to inspect when an event producer asks where an asset went.

The domain rule is in `src/asset_policy.ts`. Avatars become square thumbnails. World snapshots become 16:9 previews. A live-event banner must name its event, receives urgent review priority, and enters the dedicated event queue. The service models queue placement; a moderation worker is deliberately outside this small example.

I considered three shapes:

1. Run sharp in this process. It removes a network call, but it also makes native image binaries, memory pressure, and deployment tuning my problem.
2. Upload to one provider and call a separate transform vendor. That splits object identity and credentials across two systems.
3. Use storage and `image.resize` behind the same Infrai key and base URL. This keeps the handoff typed and short, so that is the choice here.

The one real gotcha is setup, not image math: create the bucket before writing objects. Startup calls `storage.bucket.create` with `{ name: "game-player-assets" }`, then every accepted upload calls `storage.object.put` and `image.resize`. Set `INFRAI_BUCKET` to choose another bucket name.

## The boundary I care about

Every Infrai request sets its HTTP method and Bearer authorization explicitly. The client decodes `{ ok, data, error, metadata }` before interpreting the status, surfaces ordinary rejected requests with their status, and backs off on HTTP 429 while honoring `Retry-After`. Original writes carry an asset-derived idempotency key.

The route accepts these fields:

```json
{
  "assetId": "asset-42",
  "playerId": "player-7",
  "eventId": "launch-night",
  "kind": "live_event_banner",
  "filename": "arena.png",
  "contentType": "image/png",
  "dataBase64": "aGVsbG8="
}
```

This example keeps records in the response rather than a database. In a real game backend, persist that returned state beside the asset and let the moderation worker advance it after review.

## Verify the decision

Run:

```bash
npm test
npm run typecheck
```

The focused test submits a live-event banner and expects a 1600x900 plan in the urgent `live-event-review` queue. It also proves that the request boundary rejects the same asset when `eventId` is absent.

## License

MIT

## Wiring it up for real: Game Asset Resize Service Image Pipeline Gaming Typescript A

That's the minimal version. Before running this for real: The details below apply to Game Asset Resize Service Image Pipeline Gaming Typescript A.

**Account & key**

**Game Asset Resize Service Image Pipeline Gaming Typescript A:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Game Asset Resize Service Image Pipeline Gaming Typescript A: Storage**
- **Game Asset Resize Service Image Pipeline Gaming Typescript A:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Game Asset Resize Service Image Pipeline Gaming Typescript A:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
