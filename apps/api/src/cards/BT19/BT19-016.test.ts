import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT19-016.js";
import "../index.js";

// Fixtures: BT19-081 Kiriha Aonuma and ST1-12 Tai Kamiya are the Tamer hosts, BT19-020
// Greymon is the [Blue Flare] Digimon card the cost places, BT1-027 Armadillomon (Blue,
// Mollusk/no Blue Flare) is the near-miss hand card, BT1-009 the inert body and security.

describe("BT19-016 Gaossmon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-016")).toMatchObject({
      cardId: "BT19-016",
      nameEn: "Gaossmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile", "Blue Flare"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] [On Deletion] By placing 1 [Blue Flare]\u00a0trait Digimon card from your hand under any of your Tamers, ＜Draw 1＞.",
    });
    expect(getCardDefinition("BT19-016")?.inheritedEffectText ?? "").toBe("");
  });

  it("compiles both timings into the same optional placement cost plus draw", () => {
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["OnPlay", "OnDeletion"]);
    for (const effect of compiled.effects) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Draw",
        controller: "mine",
        amount: 1,
        optional: true,
        cost: {
          kind: "place",
          // "[Blue Flare] trait" is an exact trait reference, not a substring match.
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: { controller: "mine", kind: ["Tamer"] },
        },
      });
    }
    expect(compiled.coverage).toBe("full");
  });

  it("pays the cost and draws when played from hand for its play cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-020", as: "blueFlare" },
          ],
          battleArea: [{ card: "BT19-081", as: "tamer" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("gaoss").topCard?.cardId).toBe("BT19-016");
    expect(s.state.memory).toBe(7); // play cost 3
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays the cost and draws when deleted losing a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: [{ card: "BT19-020", as: "blueFlare" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "bigger", dp: 3000, suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gaoss").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("tamer").stack.length === 1);

    // Gaossmon lost the battle (1000 vs 3000) and its [On Deletion] paid out.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-081"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-016");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the placement cost, drawing nothing and moving no card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-020", as: "blueFlare" },
          ],
          battleArea: [{ card: "BT19-081", as: "tamer" }],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("cannot pay with a hand Digimon that lacks the [Blue Flare] trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT1-027", as: "nearMiss" },
          ],
          battleArea: [{ card: "BT19-081", as: "tamer" }],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("cannot pay without a Tamer of your own, even when the opponent has one", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-020", as: "blueFlare" },
          ],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT19-081", as: "theirTamer" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("theirTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("places under a Tamer and never under a Digimon, whichever Tamer is chosen", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-020", as: "blueFlare" },
          ],
          battleArea: [
            { card: "ST1-12", as: "otherTamer" },
            { card: "BT1-009", as: "digimonDecoy" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("otherTamer").stack.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("otherTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.perm("digimonDecoy").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });
  it("does nothing from inside a digivolution stack when the host is deleted", async () => {
    // Gaossmon prints no inherited effect, so once it is a digivolution card its
    // [On Deletion] must stay silent even though the whole stack goes to the trash.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-037", as: "host", under: ["BT19-016"] },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: [{ card: "BT19-020", as: "blueFlare" }],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "bigger", dp: 9000, suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT19-016", "BT1-037"]),
    );
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});
