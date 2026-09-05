import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-009.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-009", () => {
  it("has Training and once per turn may gain +1000 DP by placing the deck's top card face-down underneath when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "untilOpponentTurnEnd",
          scaling: { unit: "targetFaceDownDigivolutionCards", per: 1, filter: { faceDown: true } },
          optional: true,
          cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
        },
      ],
    });
  });
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("places the deck top face-down and gains +1000 DP for each face-down digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-009",
              as: "source",
              under: [
                { card: "EX9-070", faceUp: false },
                { card: "EX9-071", faceUp: false },
              ],
            },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const before = source.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.currentDP === before + 3000),
    );

    const resolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX9-009")!;
    expect(resolved.stack).toHaveLength(3);
    expect(resolved.stack.at(-1)?.faceUp).toBe(false);
    expect(resolved.currentDP).toBe(before + 3000);
  });

  it("does not place a source or gain DP when its deck is empty", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-009", as: "source" }], deck: [] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const before = source.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.length > 0);

    expect(source.stack).toHaveLength(0);
    expect(source.currentDP).toBe(before);
  });

  it("applies inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-009", as: "base" }], hand: [{ card: "ST1-09", as: "stage5" }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("base");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("stage5").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(host.topCard.cardId).toBe("ST1-09");
    expect(host.currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(host.currentDP).toBe(7000);
  });
});
