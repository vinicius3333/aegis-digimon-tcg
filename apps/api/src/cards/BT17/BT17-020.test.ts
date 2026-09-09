import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-020.js";

describe("BT17-020", () => {
  it("reveals three and adds a Hybrid/Ten Warriors or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("plays an inherited-effect Tamer from hand for 2 less as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
    });
  });

  it("adds a Hybrid and an eligible Tamer from the top three", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-020", as: "strabimon" }], deck: ["BT17-023", "BT17-083", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
  });

  it("plays an inherited-effect Tamer for 2 less when its inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"] }],
          hand: [{ card: "BT17-083", as: "koji" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("koji").instanceId)).toBe(false);
  });

  it("does not treat a Security-only Tamer as an inherited-effect target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"] }],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tai").instanceId)).toBe(true);
  });

  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT17-020")).toMatchObject({
      cardId: "BT17-020",
      nameEn: "Strabimon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Hybrid"],
      types: ["Beastkin"],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Hybrid]/[Ten Warriors]\u00a0trait and 1 Tamer card with an inherited effect among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] You may play 1 Tamer card with an inherited effect from your hand with the play cost reduced by 2.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns the unpicked revealed cards to the bottom of the deck (Q2752)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-020", as: "strabimon" }],
          deck: ["BT17-023", "BT17-083", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-009"]);
  });

  it("adds the single applicable card when only one is revealed (Q2751)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-020", as: "strabimon" }],
          deck: ["BT17-023", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-023"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
  });

  it("does not treat a Tamer whose lower text is only [Security] as an inherited-effect Tamer (Q2753)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"] }],
          hand: [{ card: "BT20-089", as: "securityTamer" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityTamer").instanceId)).toBe(true);
  });

  it("fires the inherited play only once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"], dp: 20_000 }],
          hand: [
            { card: "BT17-083", as: "koji" },
            { card: "BT17-083", as: "koji2" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" as const },
      });
    const tamersInPlay = () => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT17-083").length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(tamersInPlay()).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(tamersInPlay()).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("koji2").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(tamersInPlay()).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("koji2").instanceId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
