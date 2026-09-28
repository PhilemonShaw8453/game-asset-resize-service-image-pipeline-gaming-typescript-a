const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/player-assets`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    assetId: "asset-42",
    playerId: "player-7",
    eventId: "launch-night",
    kind: "live_event_banner",
    filename: "arena.png",
    contentType: "image/png",
    dataBase64: "aGVsbG8=",
  }),
});

console.log(JSON.stringify(await response.json(), null, 2));

export {};
