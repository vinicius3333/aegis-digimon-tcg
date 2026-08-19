import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_091 } from "./BT24-091.js";
import "../index.js";

describe("BT24-091 Tidal Stream", () => {
  it("returns only the opponent's lowest-level Digimon and unsuspends TS", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "low" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((c) => c.cardId === "BT1-045"));

    expect(s.state.players[1]!.hand.some((c) => c.cardId === "BT1-045")).toBe(true);
  });

  it("links this Option to a separately selected Digimon", () => {
    const main = BT24_091.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
    });
    expect(main?.actions?.[2]).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });
});
