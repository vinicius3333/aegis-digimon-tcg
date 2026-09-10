import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-028.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok) {
    throw new Error("failed to stop the turn loop");
  }
  await loop;
}

describe("EX7-028 Piximon", () => {
  it("matches the catalog, Q3846, complete IR, alternate evolution, and exclusive registration", () => {
    expect(getCardDefinition("EX7-028")).toMatchObject({
      cardId: "EX7-028",
      nameEn: "Piximon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Fairy", "NSp"],
      effectText:
        "[Digivolve]Lv.4 w/[NSp] trait: Cost 3 \n\n[On Deletion] You may play 1 yellow or [NSp] trait Digimon card with a play cost of 4 or less from your hand without paying the cost.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -4000 DP for the turn.",
    });
    expect(digivolutionRequirementsFor("EX7-028")).toContainEqual({
      level: 4,
      traits: ["NSp"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"], playCostLte: 4 },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    playCostLte: 4,
                    nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
                  },
                ],
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -4000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
    expect(hasRegisteredCompiledCard("EX7-028")).toBe(true);
  });

  it.each([
    ["yellow", "BT1-045"],
    ["non-yellow NSp", "EX7-015"],
  ])("Q3846: publicly plays a qualifying %s Digimon after battle deletion", async (_label, candidate) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-028", as: "pix", suspended: true }],
          hand: [{ card: candidate, as: "candidate" }],
          deck: ["BT1-009"],
          security: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "attacker" }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const candidateId = s.inst("candidate").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === candidateId));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-028")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === candidateId)).toBe(false);
    await stopLoop(s, loop, 1);
  });

  it("declines the optional On Deletion play and leaves both candidates in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-028", as: "pix", suspended: true }],
          hand: [
            { card: "BT1-045", as: "legal" },
            { card: "BT1-014", as: "wrong" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "attacker" }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX7-028"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("legal").instanceId, s.inst("wrong").instanceId]),
    );
    await stopLoop(s, loop, 1);
  });

  it("evolves from a non-yellow NSp level 4 for 3 with exact draw and stack identity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-018", as: "source" }],
        hand: [{ card: "EX7-028", as: "pix" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const sourceId = s.perm("source").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("pix").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("pix").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("rejects a non-yellow non-NSp level 4 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "source" }],
        hand: [{ card: "EX7-028", as: "pix" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("pix").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("source").topCard.cardId).toBe("BT1-014");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("pix").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("retained red: preserves inherited -4000 DP through a second same-turn attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "host", under: ["EX7-028"] }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "EX7-037", as: "target", dp: 15000 }],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-014", "BT1-014", "BT1-014", "BT1-014", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 11000 && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    const attacksBeforeSecond = s.events.filter((event) => event.kind === "attackDeclared").length;
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "attackDeclared").length > attacksBeforeSecond &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(11000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(15000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 11000 && !observe(s.engine).isAttacking());
    await stopLoop(s, loop, 0);
  });

  it("expires inherited -4000 DP at turn end and rearms on the next real own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "host", under: ["EX7-028"] }],
          hand: ["BT1-011"],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "EX7-037", as: "target", dp: 15000 }],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-014", "BT1-014", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 11000 && !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(15000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 11000 && !observe(s.engine).isAttacking());
    await stopLoop(s, loop, 0);
  });
});
