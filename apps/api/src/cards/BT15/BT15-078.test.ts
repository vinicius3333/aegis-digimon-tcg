import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-078.js";
import "../index.js";

describe("BT15-078", () => {
  it("grants Piercing as its inherited effect", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("gives opponent-played Digimon an On Deletion memory loss effect once per turn", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd" }],
        },
      ],
    }));
  it("may play a level 4 or lower opposing Digimon from trash suspended and redirect the attack", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, suspended: true, suppressOnPlayEffects: true },
        { kind: "RedirectAttack", optional: true, condition: { kind: "bindingExists" } },
      ],
    }));

  it("naturally plays the opposing trash Digimon, suppresses its On Play, and redirects into it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-078", as: "waruSeadramon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          trash: [{ card: "BT15-070", as: "playedDigimon" }],
          deck: ["BT15-098", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("playedDigimon").instanceId),
    );

    // The redirected battle deletes the suspended level-3 target. Its On Play was
    // suppressed, so the deck was not revealed and the aura's On Deletion loss was applied.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.memory).toBe(4);
  });

  it("fires the opponent-played deletion watcher once per turn across two natural attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-078", as: "waruSeadramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          trash: [
            { card: "BT15-070", as: "firstPlayed" },
            { card: "BT15-070", as: "secondPlayed" },
            { card: "BT15-070", as: "thirdPlayed" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const attackerId = s.perm("waruSeadramon").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);

    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("waruSeadramon").isSuspended);
    expect(s.state.memory).toBe(4);

    const turnAfterSecondAttack = s.state.turnCount;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnCount).toBeGreaterThan(turnAfterSecondAttack);

    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("waruSeadramon").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("thirdPlayed").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
