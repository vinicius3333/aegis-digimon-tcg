import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-047.js";

describe("BT15-047", () => {
  it("makes this suspended Digimon immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));
  it("gains 1 memory once per turn when this Digimon deletes in battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { isSelfRef: true } }],
    }));

  it("grants Digimon-effect immunity only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("kabuterimon").permanentId]);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(false);
  });

  it("gains memory once for a battle deletion and again after the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST4-09", as: "host", under: ["BT15-047"] }],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
          { card: "BT1-009", as: "secondTarget", suspended: true, dp: 1000 },
          { card: "BT1-009", as: "thirdTarget", suspended: true, dp: 1000 },
        ],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("thirdTarget").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("digivolves legally from a green level-3 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "base" }],
        hand: [{ card: "BT15-047", as: "kabuterimon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-047");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-065"]);
  });
});
