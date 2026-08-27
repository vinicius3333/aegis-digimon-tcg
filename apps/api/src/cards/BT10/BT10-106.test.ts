import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-106.js";

describe("BT10-106 Justice Kick", () => {
  it("deletes an opponent Digimon up to the play cost of the Justimon it played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-064"],
          hand: [
            { card: "BT10-106", as: "option" },
            { card: "BT10-067", as: "justimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("justimon").instanceId,
        ) && s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete anything when no Justimon was played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-064"], hand: [{ card: "BT10-106", as: "option" }] },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-011");
  });

  it("does not delete anything when playing the available Justimon is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-064"],
          hand: [
            { card: "BT10-106", as: "option" },
            { card: "BT10-067", as: "justimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("justimon").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
