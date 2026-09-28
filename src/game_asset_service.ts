import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { assetUploadSchema, objectKey, planAsset } from "./asset_policy.js";
import { InfraiError, infrai } from "./infrai_client.js";

const bucket = process.env.INFRAI_BUCKET ?? "game-player-assets";

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

async function prepareAsset(raw: unknown): Promise<Record<string, unknown>> {
  const input = assetUploadSchema.parse(raw);
  const plan = planAsset(input);
  const originalKey = objectKey(input);
  await infrai.storage.object.put(bucket, originalKey, {
    data_base64: input.dataBase64,
    content_type: input.contentType,
    idempotency_key: `original-${input.assetId}`,
  });
  const thumbnail = await infrai.image.resize({
    image: `data:${input.contentType};base64,${input.dataBase64}`,
    width: plan.width,
    height: plan.height,
    fit: "cover",
    enlarge: false,
    format: "webp",
    store: true,
  });
  return { assetId: input.assetId, playerId: input.playerId, eventId: input.eventId, originalKey, thumbnail, ...plan };
}

export async function start(): Promise<void> {
  await infrai.storage.bucket.create({ name: bucket });
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/player-assets") {
      reply(response, 404, { error: "Route not found" });
      return;
    }
    try {
      reply(response, 201, await prepareAsset(await readJson(request)));
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        reply(response, 400, { error: "Invalid request body" });
      } else if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        reply(response, status, { error: error.message, code: error.code });
      } else {
        reply(response, 502, { error: error instanceof Error ? error.message : "Asset processing failed" });
      }
    }
  });
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Game asset service listening on http://localhost:${port}`));
}

await start();
