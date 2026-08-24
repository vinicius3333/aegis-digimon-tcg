import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-100.js";
import "../index.js";

describe("BT26-100 compiled fidelity", () => {
  it("encodes the no-face-up waiver, face-up security grants, security recycle, and two free-play modes", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "faceUpSecurityAtMost", value: 0 } }],
    });
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "ModifyDP", amount: 3000 },
      ],
    });
    expect(card?.effects?.[2]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
      { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
    ]);
    expect(card?.effects?.[3]?.actions).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
    ]);
  });

  it("grants Blocker and +3000 DP to own Titan Digimon while face up in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-100", as: "darkField", faceUp: true }],
        battleArea: [
          { card: "BT26-074", as: "titan" },
          { card: "BT26-059", as: "plutomon" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("titan").keywords).toContain("Blocker");
    expect(s.perm("titan").currentDP).toBe(10000);
  });

  it("Q7181: a Plutomon without the Titan trait enables the bonus but does not receive it", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-100", as: "darkField", faceUp: true }],
        battleArea: [
          { card: "BT26-074", as: "titan" },
          { card: "BT4-089", as: "nonTitanPlutomon" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("titan").keywords).toContain("Blocker");
    expect(s.perm("titan").currentDP).toBe(10000);
    expect(s.perm("nonTitanPlutomon").keywords).not.toContain("Blocker");
    expect(s.perm("nonTitanPlutomon").currentDP).toBe(12000);
  });

  it("uses its Main effect without color, recycles bottom security, and freely plays a level-4 Titan", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-100", as: "darkField" },
            { card: "BT24-042", as: "titan" },
          ],
          security: [{ card: "BT1-009", as: "bottomSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkField").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-042"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bottomSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("darkField").instanceId,
      faceUp: true,
    });
  });

  it("Q7174/Q7175: with zero security, still uses without color and places itself face up", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-100", as: "darkField" }] } });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkField").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("darkField").instanceId),
    );

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("darkField").instanceId,
      faceUp: true,
    });
  });
});
