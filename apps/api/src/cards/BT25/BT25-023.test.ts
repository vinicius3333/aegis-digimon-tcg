import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_023 } from "./BT25-023.js";
import "../index.js";

describe("BT25-023 Gaogamon", () => {
  it("matches the printed identity and alternate evolution requirement", () => {
    expect(getCardDefinition("BT25-023")).toMatchObject({
      colors: ["Blue"],
      level: 4,
      playCost: 5,
      dp: 6000,
      types: ["Beast", "DATA SQUAD"],
    });
    expect(digivolutionRequirementsFor("BT25-023")).toEqual([
      { level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true },
    ]);
  });

  it("plays one Thomas H. Norstein Tamer only with at most one Tamer in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_023.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "name" }],
          },
          count: 1,
        },
        condition: {
          kind: "permanentCount",
          filter: { controllerDefault: "mine", kind: ["Tamer"] },
          op: "lte",
          value: 1,
        },
      });
    }
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_023.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });

  it("plays BT25-087 Thomas H. Norstein from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-087"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toContain("BT25-087");
  });

  it("plays Thomas naturally after the alternate DATA SQUAD evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-087"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT25-023", "BT25-087"]);
    expect(s.state.memory).toBe(0);
  });

  it("does not play Thomas when two Tamers are already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-087", as: "existingThomas" },
            { card: "BT13-097", as: "otherTamer" },
          ],
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-023"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT25-087")).toHaveLength(1);
  });

  it("plays Thomas with exactly one own Tamer and ignores an opponent Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "ownTamer" }],
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
        1: { battleArea: [{ card: "BT1-086", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-087"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT25-087")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((p) => p.topCard?.cardId === "BT1-086")).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("does not play a different Tamer name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT1-085", as: "wrongTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-023"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTamer").instanceId);
  });

  it("can be legally evolved over a DATA SQUAD level 3 and keeps the source card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
          hand: [{ card: "BT25-023", as: "gaogamon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").topCard.cardId === "BT25-023");
    expect(s.perm("gaomon").stack.map((card) => card.cardId)).toEqual(["BT25-021"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects the alternate evolution over a level 3 without DATA SQUAD", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonTrait" }],
        hand: [{ card: "BT25-023", as: "gaogamon" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonTrait").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gaogamon").instanceId);
  });

  it("allows declining the optional Thomas play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-023"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).not.toContain("BT25-087");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("thomas").instanceId);
  });

  it("draws for both players on one public attack, then does not repeat on the second attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "host", under: ["BT25-023"] }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"], deck: ["AD1-003", "AD1-004"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[1]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["AD1-001"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["AD1-003"]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["AD1-002"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["AD1-004"]);
  });
});
