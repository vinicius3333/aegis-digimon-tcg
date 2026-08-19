import { describe, expect, it } from "vitest";
import { compiled as BT24_082 } from "./BT24-082.js";
import "../index.js";

describe("BT24-082 Owen Dreadnought", () => {
  it("returns itself to deck bottom and gates the chained Elizamon play", () => {
    const start = BT24_082.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      cost: { kind: "return", to: "deckBottom" },
      from: ["hand"],
      abortOnDecline: true,
    });
    expect(start?.actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
    });
    const watcher = BT24_082.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({ event: "whenOneOfYoursDigivolves", cost: { kind: "suspend" } });
    expect(watcher.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "ModifyDP", amount: 3000 }),
        expect.objectContaining({ kind: "Attack" }),
      ]),
    );
  });
});
