import { describe, expect, it } from "vitest";
import { getCardDefinition, type DecisionRequest, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-039.js";

function optionalPrompts(s: EngineSetup): DecisionRequest[] {
  return (s.decisions as { seat: Seat; req: DecisionRequest }[])
    .map(({ req }) => req)
    .filter((req) => req.kind === "optional");
}

describe("BT19-039 SkullBaluchimon", () => {
  it("matches the catalog printing this audit reads from", () => {
    expect(getCardDefinition("BT19-039")).toMatchObject({
      cardId: "BT19-039",
      nameEn: "SkullBaluchimon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Undead", "X Antibody"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      effectText:
        "[On Play] [When Digivolving] By trashing your top security card, delete 1 of your opponent's level 4 or lower Digimon and gain 1 memory.\n[On Deletion] ＜Recovery +1 (Deck)＞.",
      inheritedEffectText: "[All Turns] [Once Per Turn] When your security is reduced, you may unsuspend this Digimon.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]?.actions?.[1]).toEqual({ kind: "GainMemory", amount: 1 });
    expect(compiled.effects?.[1]?.actions?.[1]).toEqual({ kind: "GainMemory", amount: 1 });
  });

  it("pays with the TOP security card, deletes only the level 4 or lower Digimon and gains 1 memory on a real play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-039", as: "skull" }, { card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-010", as: "secSecond" },
            { card: "BT1-011", as: "secThird" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-051", as: "level4" },
            { card: "BT1-057", as: "level5" },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.memory === 4);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secSecond").instanceId,
      s.inst("secThird").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-057"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("resolves the same clause on a public digivolve from a yellow Lv.4, with the source in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "source" }],
          hand: [{ card: "BT19-039", as: "skull" }, { card: "BT1-013" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011"],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-010", as: "secSecond" },
          ],
        },
        1: {
          battleArea: [{ card: "BT3-037", as: "level4" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.perm("skull").topCard?.cardId).toBe("BT19-039");
    expect(s.perm("skull").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secSecond").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT3-037"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional processing condition stops the deletion AND the memory gain", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-039", as: "skull" }, { card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-010", as: "secSecond" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "level4" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-039"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secSecond").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-051"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Recovery +1 (Deck)＞ moves exactly the top deck card to the top of security when it loses a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-039", as: "skull" }],
          deck: [{ card: "BT1-009", as: "deckTop" }, { card: "BT1-010", as: "deckSecond" }, "BT1-011"],
          hand: [{ card: "BT1-013" }],
          security: [{ card: "BT1-009", as: "secTop" }],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", dp: 12_000, suspended: true }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      s.inst("secTop").instanceId,
    ]);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckSecond").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-039"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("wall").permanentId,
    ]);
  });

  it("inherited clause unsuspends its host once per turn, only for the controller's own security, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-042", as: "host", under: ["BT19-039"] },
            { card: "BT1-042", as: "peer" },
          ],
          hand: [{ card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "raider" },
            { card: "BT2-014", as: "raiderTwo" },
          ],
          hand: [{ card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 3);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(optionalPrompts(s)).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(optionalPrompts(s)).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raiderTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 3);
    expect(optionalPrompts(s)).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(optionalPrompts(s)).toHaveLength(2);
    expect(s.perm("peer").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not arm the inherited watcher from the top card of a stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-039", as: "onTop", under: ["BT1-051"], suspended: true },
          { card: "BT1-042", as: "host", under: ["BT19-039"], suspended: true },
        ],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009"], security: ["BT1-009"] },
    });
    await s.ready();

    expect(observe(s.engine).subscriptions("whenSecurityRemoved", s.perm("host").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenSecurityRemoved", s.perm("onTop").permanentId)).toHaveLength(0);
  });
});
