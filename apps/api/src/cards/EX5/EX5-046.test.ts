import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-046.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-045.js";
import "../BT11/BT11-040.js";
import "../BT3/BT3-063.js";
import "../index.js";

describe("EX5-046 Targetmon", () => {
  it("matches the catalog and encodes Blocker, rule names, deletion return, and replacement", () => {
    expect(getCardDefinition("EX5-046")).toMatchObject({
      cardId: "EX5-046",
      nameEn: "Targetmon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 3000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Puppet"],
      effectText: expect.stringContaining("return this card to the hand"),
      inheritedEffectText: expect.stringContaining("prevent that deletion"),
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Blocker" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Etemon", "Sukamon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "AddToHandSelf",
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      optional: false,
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          actions: [{ kind: "Prevent", optional: false }],
        },
      ],
    });
  });

  it("uses Blocker through the public block window and then resolves On Deletion (Q3623)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-046", as: "source" }],
          hand: [{ card: "BT11-040", as: "cost" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    const sourceId = s.inst("source").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("source").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === sourceId));
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.from === "battleArea" &&
          event.to === "trash" &&
          event.instanceIds.includes(sourceId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("returns itself to hand after public battle deletion, after first reaching trash (Q3623)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-046", as: "source", suspended: true }],
          hand: [{ card: "BT11-040", as: "cost" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === sourceId));
    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.from === "battleArea" &&
          event.to === "trash" &&
          event.instanceIds.includes(sourceId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("uses the inherited replacement once and locks the immediate recursive activation (Q3624)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", under: ["EX5-046"], as: "hostA", dp: 1000, suspended: true },
            { card: "BT11-040", under: ["EX5-046"], as: "hostB", dp: 1000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostAId = s.perm("hostA").permanentId;
    const hostBId = s.perm("hostB").permanentId;
    const hostATopId = s.inst("hostA").instanceId;
    const hostBTopId = s.inst("hostB").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostAId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostAId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostBId)).toBe(false);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === hostAId)!.topCard?.instanceId).toBe(hostATopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostBTopId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("evolves legally from a yellow level-three source and rejects a red source", async () => {
    const legal = setupEngine(
      { 0: { battleArea: [{ card: "BT1-045", as: "base" }], hand: [{ card: "EX5-046", as: "targetmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 7;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("targetmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === "EX5-046");
    expect(legal.state.memory).toBe(4);
    expect(legal.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Blocker")).toBe(true);
    expect(legal.state.pendingDecision).toBeUndefined();

    const illegal = setupEngine(
      { 0: { battleArea: [{ card: "BT1-013", as: "wrongSource" }], hand: [{ card: "EX5-046", as: "targetmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    illegal.state.memory = 7;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongSource").permanentId,
        instanceId: illegal.inst("targetmon").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(7);
    expect(illegal.perm("wrongSource").topCard?.cardId).toBe("BT1-013");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-046"]);
  });
});
