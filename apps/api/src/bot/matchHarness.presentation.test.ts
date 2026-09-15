import { expect, it } from "vitest";
import { metaDeckByVersion } from "./metaDecks/index.js";
import { runBotMatch } from "./matchHarness.js";
import { analyzePresentationEvents } from "./presentationOracle.js";

it("closes immediate subtrigger presentation events in a real bot match", async () => {
  const left = metaDeckByVersion("bt1-red-omnimon@1")!;
  const right = metaDeckByVersion("bt5-shoutmon-dx@1")!;
  const result = await runBotMatch({
    seed: 20_889_288,
    seats: [
      { profile: "balanced", deck: { mainDeck: [...left.decklist.mainDeck], eggDeck: [...left.decklist.eggDeck] } },
      { profile: "balanced", deck: { mainDeck: [...right.decklist.mainDeck], eggDeck: [...right.decklist.eggDeck] } },
    ],
    captureEvents: true,
  });

  expect(result.events).toBeDefined();
  expect(result.events).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT5-091" }));
  expect(analyzePresentationEvents(result.events!, { maximumBurst: 40 }).anomalies).toEqual([]);
});
