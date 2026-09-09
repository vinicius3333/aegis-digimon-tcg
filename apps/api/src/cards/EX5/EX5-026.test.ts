import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-026.js";
import "../BT14/BT14-058.js";
import "../BT14/BT14-086.js";
import "../index.js";

describe("EX5-026 MetalGarurumon (X Antibody)", () => {
  it("matches the catalog and encodes Blocker, the conditional aura, and same-level deletion", () => {
    expect(getCardDefinition("EX5-026")).toMatchObject({
      cardId: "EX5-026",
      nameEn: "MetalGarurumon (X Antibody)",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "X Antibody"],
      effectText: expect.stringContaining("Lose 4 memory"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      effectText: "[When Attacking] Lose 4 memory",
      duration: "untilOpponentTurnEnd",
      includeLaterEntrants: true,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { match: "nameExact", tokens: ["MetalGarurumon"] },
            { match: "trait", tokens: ["X Antibody"] },
          ],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      {
        kind: "Delete",
        allowCostWithoutTarget: true,
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            relativeTo: { attr: "level", op: "eq", selectionRef: "returnedDigimon" },
          },
          count: 1,
        },
        cost: {
          kind: "return",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1 },
          to: "deckBottom",
          bindResultAs: "returnedDigimon",
        },
      },
      {
        kind: "Return",
        condition: { kind: "ifThisEffectDidNotAct" },
        target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1 },
        to: "deckBottom",
        from: ["trash"],
      },
    ]);
  });

  it("evolves legally from the blue/purple level-five X Antibody peer and affects a later Rush entrant", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-023", as: "source" },
            { card: "BT1-014", as: "auraTarget", dp: 7000, suspended: true },
          ],
          hand: [{ card: "EX5-026", as: "metal" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-014"],
        },
        1: {
          hand: [
            { card: "BT14-058", as: "laterEntrant" },
            { card: "BT14-086", as: "satsuki" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX5-026");
    expect(s.state.memory).toBe(6);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX5-023"]);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("laterEntrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("laterEntrant").topCard?.cardId === "BT14-058" &&
        s.perm("laterEntrant").stack.some((card) => card.cardId === "BT14-086") &&
        observe(s.engine).hasKeyword(s.perm("laterEntrant"), "Rush"),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("laterEntrant").permanentId,
        target: { kind: "digimon", permanentId: s.perm("auraTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not grant the lose-four aura when the legal level-five source has no matching name or trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-021", as: "source" },
            { card: "BT1-014", as: "auraTarget", dp: 7000, suspended: true },
          ],
          hand: [{ card: "EX5-026", as: "metal" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX5-026");
    expect(s.state.memory).toBe(6);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "digimon", permanentId: s.perm("auraTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks a player attack through the public blocker timing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-026", as: "blocker" }], security: ["BT1-014"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("returns one trash Digimon to deck bottom and deletes exactly one opposing Digimon at that level", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-026", as: "attacker", under: ["EX5-023"] }],
          trash: [{ card: "EX5-023", as: "returned" }],
          deck: ["BT1-011"],
          security: ["BT1-014"],
        },
        1: {
          battleArea: [
            { card: "EX5-021", as: "sameLevel" },
            { card: "BT1-080", as: "differentLevel" },
          ],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("returned").instanceId, s.perm("sameLevel").topCard!.instanceId);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX5-021", "BT1-014"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("returned").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "EX5-023"]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-080"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("covers Q3588: a returned level may differ from every opposing level without blocking the return", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-026", as: "attacker", under: ["EX5-023"] }],
          trash: [{ card: "EX5-023", as: "returned" }],
          deck: ["BT1-011"],
          security: ["BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "levelSix" }], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("returned").instanceId);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("returned").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "EX5-023"]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-080"]);
  });

  it("covers Q3589: a returned no-level Digimon cannot select an opposing no-level Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-026", as: "attacker", under: ["EX5-023"] }],
          trash: [{ card: "EX2-052", as: "returnedNoLevel" }],
          deck: ["BT1-011"],
          security: ["BT1-014"],
        },
        1: { battleArea: [{ card: "EX2-052", as: "opponentNoLevel" }], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("returnedNoLevel").instanceId);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(
      s.inst("returnedNoLevel").instanceId,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("returnedNoLevel").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "EX2-052"]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX2-052"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("evolves legally from the alternate purple level-five route and rejects an illegal level-four source", async () => {
    const legal = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-071", as: "purpleSource" }], hand: [{ card: "EX5-026", as: "metal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 10;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleSource").permanentId,
        instanceId: legal.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleSource").topCard?.cardId === "EX5-026");
    expect(legal.state.memory).toBe(6);
    expect(legal.perm("purpleSource").stack.map((card) => card.cardId)).toEqual(["BT11-071"]);

    const illegal = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "wrongLevel" }], hand: [{ card: "EX5-026", as: "metal" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    illegal.state.memory = 10;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongLevel").permanentId,
        instanceId: illegal.inst("metal").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(10);
    expect(illegal.perm("wrongLevel").topCard?.cardId).toBe("BT1-009");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-026"]);
  });
});
