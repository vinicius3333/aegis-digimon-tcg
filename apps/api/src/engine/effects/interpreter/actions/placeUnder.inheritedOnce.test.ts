import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../../testkit/harness.js";
import "../../../../cards/index.js";

describe("PlaceUnder keeps a placed card's inherited effects single", () => {
  it("arms Strabimon's [When Attacking] once after AD1-020 placed it and then digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-020", as: "tamer" },
            { card: "BT6-022", as: "strabimon" },
            { card: "BT21-012", as: "flamemon" },
            { card: "AD1-002", as: "aldamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-010", "BT1-010"], battleArea: [{ card: "BT1-030", as: "opp" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.stack.length === 2));
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "AD1-020")!;
    expect(host.stack.map((card) => card.cardId)).toEqual(["BT6-022", "BT21-012"]);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("aldamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "AD1-002");
    await settle();

    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== before);
    await settle();

    expect(s.decisions.filter((decision) => decision.req.kind === "orderTriggers")).toEqual([]);
    expect(s.state.memory).toBe(before + 1);
  });
});
