import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-045.js";
import "../index.js";

describe("BT16-045", () => {
  it("optionally suspends a Digimon and gives yours 3000 DP", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", optional: true });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        optional: true,
      });
    }
  });

  it("redirects an opponent's attack to a suspended Insectoid as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [{ kind: "RedirectAttack", optional: true }],
    });
  });

  it("suspends a Digimon and boosts one of yours on play", async () => {
    const options = { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] as string[] };
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-045", as: "metallife" }],
          battleArea: [{ card: "BT16-042", as: "ally", dp: 4000 }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      options,
    );
    options.preferInstanceIds.push(s.perm("opponent").permanentId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallife").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.perm("ally").currentDP === 7000);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("ally").currentDP).toBe(7000);
  });
});
