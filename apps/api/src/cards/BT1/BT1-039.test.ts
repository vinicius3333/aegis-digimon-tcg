import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT1-039.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-039 Cerberusmon", () => {
  it("matches the catalog and exact optional twice-per-turn IR", () => {
    expect(getCardDefinition("BT1-039")).toMatchObject({
      cardId: "BT1-039",
      set: "BT1",
      nameEn: "Cerberusmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Dark Animal"],
      effectText: "[When Attacking][Twice Per Turn] You can unsuspend this Digimon by trashing 3 cards in your hand.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-039",
      nameJp: "ケルベロモン",
    });
    expect(getCardDefinition("BT1-039")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-039")?.securityEffectText).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        isInherited: false,
        frequency: "TwicePerTurn",
        optional: true,
        actions: [
          {
            kind: "Unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 3 } },
          },
        ],
      },
    ]);
  });

  it("can trash 3 cards to unsuspend when attacking, up to twice per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "attacker" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          hand: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
        1: { deck: ["BT1-013", "BT1-014", "BT1-015"], security: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.length === 6 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking,
    );
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.length === 3 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking,
    );
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(attack().ok).toBe(false);
  });

  it("cannot partially pay the three-card hand cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-039", as: "attacker" }], hand: ["BT1-010", "BT1-011"] },
        1: { security: ["BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("may decline before counter timing without trashing cards (Q894)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-039", as: "attacker" }], hand: ["BT1-010", "BT1-011", "BT1-012"] },
        1: { security: ["BT1-016"] },
      },
      { autoAcceptOptional: false },
    );
    const before = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT1-039" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(before);
  });

  it("resets the Twice Per Turn allowance on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "attacker" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          hand: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
        1: { deck: ["BT1-013", "BT1-014", "BT1-015"], security: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    const firstTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 6 && !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3 && !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3 && s.perm("attacker").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && !s.perm("attacker").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("digivolves legally from blue level 4, draws, and retains the source card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "base" }],
        hand: [{ card: "BT1-039", as: "cerberusmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cerberusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("cerberusmon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-037"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a red level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "BT1-039", as: "cerberusmon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cerberusmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
