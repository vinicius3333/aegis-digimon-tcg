import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-113.js";
import "./BT4-114.js";
import "../BT7/BT7-112.js";
import "../P/P-029.js";
import "../P/P-030.js";
import "../P/P-036.js";

function delayEffectKey(s: ReturnType<typeof setupEngine>): string {
  const boost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "P-036")!;
  const source = (s.engine as unknown as { cardSourceOf(card: typeof boost.topCard): unknown }).cardSourceOf(boost.topCard);
  return effectsOf(EffectTiming.OnDeclaration, source as never)[0]!.effectKey;
}

describe("BT4 Ancient Hybrid deck", () => {
  it("chains AncientGarurumon restand into AncientGreymon's three checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-114", as: "ancientGarurumon" },
            { card: "BT4-025", as: "lobomon", suspended: true },
            {
              card: "BT4-113",
              as: "ancientGreymon",
              under: ["BT4-011", "BT4-013"],
            },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancientGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("ancientGarurumon").isSuspended &&
        !s.perm("lobomon").isSuspended &&
        s.state.players[1]!.security.length === 5 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancientGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 4 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("ancientGreymon"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancientGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 5000);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("chains Blue Memory Boost into promo Lobomon and AncientGarurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "base" }],
          hand: [
            { card: "P-036", as: "memoryBoost" },
            { card: "BT4-114", as: "ancientGarurumon" },
          ],
          deck: [
            { card: "P-030", as: "promoLobomon" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("memoryBoost").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("promoLobomon").instanceId) &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-036"),
    );
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("unrevealed").instanceId);

    const boost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "P-036")!;
    // Delay can't be activated on the turn the Option entered; advance the fixture to its next turn.
    s.state.turnCount += 1;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: boost.topCard!.instanceId,
      effectKey: delayEffectKey(s),
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("memoryBoost").instanceId));
    await settle();
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("promoLobomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-114");

    expect(s.perm("base").topCard?.cardId).toBe("BT4-114");
    expect(s.perm("base").stack.some((card) => card.cardId === "P-030")).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("keeps the red and blue promo inherited discounts isolated by host and Ancient name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-020", as: "redHost", under: ["P-029"] },
          { card: "AD1-011", as: "blueHost", under: ["P-030"] },
        ],
        hand: [
          { card: "BT4-113", as: "ancientGreymon" },
          { card: "BT4-114", as: "ancientGarurumon" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("redHost").permanentId,
      instanceId: s.inst("ancientGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("redHost").topCard.cardId === "BT4-113");
    await settle();
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("blueHost").permanentId,
      instanceId: s.inst("ancientGarurumon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("blueHost").topCard.cardId === "BT4-114");

    expect(s.state.memory).toBe(4);
    expect(s.perm("redHost").stack.some((card) => card.cardId === "P-029")).toBe(true);
    expect(s.perm("blueHost").stack.some((card) => card.cardId === "P-030")).toBe(true);
  });

  it("recycles red, blue, and yellow Hybrids into Susanoomon beside AncientGreymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-088", as: "zoe" },
            {
              card: "BT4-113",
              as: "ancientGreymon",
              under: ["BT4-011", "BT4-013"],
            },
          ],
          hand: [
            { card: "BT7-112", as: "susanoomon" },
            "BT4-011",
            "BT4-025",
            "BT7-021",
            "BT7-038",
            "BT7-046",
          ],
          trash: ["BT4-011", "BT4-025", "BT7-021", "BT7-038", "BT7-046"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "deleted" }],
          security: ["BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("zoe").permanentId,
      instanceId: s.inst("susanoomon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("zoe").topCard.cardId === "BT7-112" &&
      s.state.players[1]!.battleArea.length === 0,
    );
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[0]!.deck).toHaveLength(10);
    expect(observe(s.engine).keywordAmount(s.perm("zoe"), "SecurityAttack")).toBe(2);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ancientGreymon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 3 &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("zoe").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
