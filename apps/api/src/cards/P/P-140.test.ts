import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-140.js";

describe("P-140 MegaKabuterimon", () => {
  it("reduces an opponent's Digimon by 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-140", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("encodes Evade, suspended immunity, Insectoid digivolution, and inherited security trash", () => {
    const compiled = getCompiledCard("P-140")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "immuneToOpponentDigimonEffects",
              duration: "permanent",
              condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDeletesInBattle",
              actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
            },
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Insectoid"], cost: 3, isAlternate: true }]);
  });
});
