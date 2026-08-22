import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-056.js";
import "../index.js";

// A3 for BT16-056 (Publimon) — [On Play] you may place the top card of 1 of your opponent's
// [Vaccine] Digimon on top of their security stack (trashing its digivolution cards).
// source: documented behavior.
//
// FAILS-WHEN-REVERTED: the opponent's top card moves to their SECURITY stack (their security
// count grows by 1 and the moved card is the one that was on top of the Digimon) only because
// the override runs the place-top-card-to-security clause. A no-op leaves security unchanged.

describe("BT16-056 [On Play] place top card of an opponent [Vaccine] Digimon onto their security", () => {
  it("uses the same optional placement on play and digivolution and watches opponent security once per turn", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "opponent",
      detachPermanentTop: true,
      optional: true,
    });
    expect(compiled.effects[1]?.actions[0]).toEqual(compiled.effects[0]?.actions[0]);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: { kind: "triggerSecurityIsOpponents" },
          actions: [{ kind: "SecurityManipulation", chooseTopOrBottom: true }],
        },
      ],
    });
  });

  it("moves the opponent Vaccine Digimon's top card to their security stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-056", as: "publimon", faceUp: false }],
        },
        1: {
          // Opponent Vaccine Digimon (Greymon) with one digivolution card under it.
          battleArea: [{ card: "BT1-015", as: "oppDigimon", dp: 4000, under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    const securityBefore = p1.security.length;

    s.state.memory = 4; // exact play cost

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("publimon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.security.length > securityBefore);

    // The opponent's former top card is now on their security stack.
    expect(p1.security.length).toBe(securityBefore + 1);
    expect(p1.security.some((c) => c.instanceId === oppTopId)).toBe(true);
  });

  it("trashes an opponent security card when the placement leaves them at 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-056", as: "publimon" }] },
        1: {
          battleArea: [{ card: "BT1-015", as: "oppDigimon", under: [{ card: "BT1-009" }] }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("publimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p1.trash.length === 1);

    expect(p1.security).toHaveLength(2);
    expect(p1.trash).toHaveLength(1);
  });
});
