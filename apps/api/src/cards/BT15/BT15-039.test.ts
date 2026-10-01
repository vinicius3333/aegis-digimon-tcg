import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-039.js";

describe("BT15-039", () => {
  it("gives one opposing Digimon -3000 DP and makes it lose 1 memory on deletion", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      gainedActions: [{ kind: "GainMemory", amount: -1 }],
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { sameTarget: true },
    });
  });

  it("binds DP loss and deletion memory loss to the same opponent on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-039", as: "bomber" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bomber").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 2, 1_500);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });
  it("grants Gammamon-related effects on all turns and inherited all turns", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "GrantStatic", grant: "effects", excludeInherited: true }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "GrantStatic", grant: "effects", excludeInherited: true }],
    });
  });

  it("does not borrow an inherited Gammamon effect (KB Q2523)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-039", as: "bomber", under: ["BT8-008"] }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "firstTarget" },
            { card: "BT1-009", dp: 3000, as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bomber").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

describe("BT15-039 Bombermon — KB Q&A rulings", () => {
  it("makes the opponent lose 1 memory when its -3000 DP deletes a 3000 DP Digimon with the gained [On Deletion] (Q2520)", async () => {
    async function playBombermonAgainst(opponentDP: number) {
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT15-039", as: "bomber" }] },
          1: { battleArea: [{ card: "BT1-009", dp: opponentDP, as: "target" }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 8;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bomber").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-039"));
      return s;
    }

    const deleted = await playBombermonAgainst(3000);
    await settle(() => deleted.state.players[1]!.battleArea.length === 0 && deleted.state.memory === 2, 1_500);
    expect(deleted.state.players[1]!.battleArea).toHaveLength(0);
    expect(deleted.state.memory).toBe(2);

    const survivor = await playBombermonAgainst(4000);
    await settle(() => survivor.perm("target").currentDP === 1000, 1_500);
    expect(survivor.perm("target").currentDP).toBe(1000);
    expect(survivor.state.memory).toBe(1);
  });

  it("activates the [When Digivolving] effect of a [Gammamon]-named digivolution card when digivolving into it (Q2521)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-019", as: "betelGammamon", under: ["BT8-008"] }],
          hand: [
            { card: "BT15-039", as: "bomber" },
            { card: "BT21-080", as: "hiro" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betelGammamon").permanentId,
        instanceId: s.inst("bomber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("hiro").instanceId),
    );

    expect(s.perm("betelGammamon").topCard?.cardId).toBe("BT15-039");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("hiro").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("hiro").instanceId),
    ).toBe(true);
  });

  it("activates a gained [When Digivolving] <Blitz> from a [Gammamon]-named card and attacks while the opponent has memory (Q2522)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-013", as: "betelGammamon", under: ["BT8-008"] }],
        hand: [{ card: "BT15-039", as: "bomber" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betelGammamon").permanentId,
        instanceId: s.inst("bomber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.memory).toBe(-1);
    const blitzDecision = s.state.pendingDecision!;
    expect(JSON.parse(blitzDecision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blitzDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("betelGammamon").permanentId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("betelGammamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("betelGammamon").topCard?.cardId).toBe("BT15-039");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
