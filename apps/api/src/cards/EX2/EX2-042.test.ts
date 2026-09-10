import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-042.js";
import "./EX2-040.js";
import "../BT1/BT1-036.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];
const TURN_DECK = [...INERT_DECK, ...INERT_DECK, ...INERT_DECK, ...INERT_DECK];

describe("EX2-042 Mephistomon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("EX2-042")).toMatchObject({
      cardId: "EX2-042",
      nameEn: "Mephistomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Fallen Angel"],
      effectText: "[On Play] ＜Draw 2＞. (Draw 2 cards from your deck.) Then, trash 2 cards in your hand.",
      inheritedEffectText: "[When Attacking][Once Per Turn] You may trash 1 card in your hand to gain 1 memory.",
    });
    const card = runtimeCompiledCard("EX2-042");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          { kind: "Draw", controller: "mine", amount: 2 },
          { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
        ],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            optional: true,
            cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
          },
        ],
      },
    ]);
    expect(compiled).toEqual(card);
  });

  it("draws 2 and then trashes exactly 2 cards on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-042", as: "mephistomon" }, "BT1-009", "BT1-013"],
          deck: [{ card: "BT1-014", as: "drawOne" }, { card: "BT1-009", as: "drawTwo" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mephistomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2 && s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawOne").instanceId,
      s.inst("drawTwo").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(INERT_DECK.length);
    expect(s.state.memory).toBe(3);
  });

  it("legally evolves from purple level 4 and rejects a blue source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX2-040", as: "purpleSource" }],
        hand: [{ card: "EX2-042", as: "mephistomon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleSource").permanentId,
        instanceId: legal.inst("mephistomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleSource").topCard?.cardId === "EX2-042");
    expect(legal.perm("purpleSource").stack.map((card) => card.cardId)).toEqual(["EX2-040"]);
    expect(legal.state.memory).toBe(2);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-042", as: "mephistomon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("blueSource").permanentId,
        instanceId: illegal.inst("mephistomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("trashes one hand card for 1 memory only once per turn and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-040", as: "base" }],
          hand: [
            { card: "EX2-042", as: "mephistomon" },
            { card: "BT3-089", as: "host" },
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-013", as: "secondCost" },
            { card: "BT1-036", as: "unsuspender" },
          ],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: TURN_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mephistomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-042");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT3-089");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-040", "EX2-042"]);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const beforeFirstAttack = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstCost").instanceId));
      expect(s.state.memory).toBe(beforeFirstAttack + 1);
      expect(s.perm("base").isSuspended).toBe(true);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.perm("base").isSuspended);
      const beforeSecondAttack = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.perm("base").isSuspended);
      expect(s.state.memory).toBe(beforeSecondAttack);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondCost").instanceId);

      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("base").isSuspended).toBe(false);
      const beforeResetAttack = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondCost").instanceId));
      expect(s.state.memory).toBe(beforeResetAttack + 1);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
