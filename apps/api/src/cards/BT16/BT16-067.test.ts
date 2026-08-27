import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-067.js";
import "../index.js";

describe("BT16-067", () => {
  it("optionally gives one of your Digimon 3000 DP by trashing a card", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "forTheTurn",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
    }
  });

  it("draws when another of your Digimon is played as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Draw", amount: 1 }] }],
    });
  });

  it("trashes a hand card to boost an own Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-067", as: "lopmon" },
            { card: "BT1-009", as: "payment" },
          ],
          battleArea: [{ card: "BT1-009", as: "ally", dp: 3000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 6000);

    expect(s.perm("ally").currentDP).toBe(6000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
  });
});
