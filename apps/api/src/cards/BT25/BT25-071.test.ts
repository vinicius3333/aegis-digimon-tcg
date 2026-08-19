import { describe, expect, it } from "vitest";
import { compiled as BT25_071 } from "./BT25-071.js";
import "../index.js";

describe("BT25-071 Gawappamon", () => {
  it("restricts one opposing attacker and reveals a free TS play on suspension", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      });
    }
    const watchers = BT25_071.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(watchers).toHaveLength(2);
    for (const watcher of watchers ?? []) {
      expect(watcher).toMatchObject({ frequency: "OncePerTurn" });
      const sub = watcher.actions?.[0] as { event?: string; actions?: unknown[] };
      expect(sub).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
      expect(sub.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
              playCostLte: 4,
            },
            count: 1,
            to: "play",
            optional: true,
          },
        ],
      });
    }
  });
});
