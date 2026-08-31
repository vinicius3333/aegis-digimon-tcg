import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-046.js";
import "../index.js";

describe("ST12-03 Solarmon", () => {
  it("prevents both players from reducing play costs", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-03", "BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(0);
  });

  it("also prevents the opponent from reducing a play cost", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] },
      1: { battleArea: ["ST12-03"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
  });

  it("does not block an effect that plays a Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT13-090", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sister").instanceId),
    );
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("sister").instanceId)).toBe(false);
  });

  it("also prevents a green Tamer's play-cost reduction and its suspend cost (Q755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT14-046", as: "togemon" }, { card: "BT1-064", as: "green" }],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    expect(s.state.memory).toBe(0);
    expect(s.perm("togemon").isSuspended).toBe(false);
    expect(s.perm("green").isSuspended).toBe(false);
  });
});
