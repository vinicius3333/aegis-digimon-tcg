import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-094.js";
import "../index.js";

function playCard(s: ReturnType<typeof setup>): { instanceId: string } {
  const p0 = s.state.players[0] as PlayerState;
  p0.battleArea.push(digimon(0, 3000, "AD1-011"));
  const option = instance("BT21-094", 0, true);
  p0.hand.push(option);
  s.state.memory = 0;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("BT21-094 [Main] reveal-and-add", () => {
  it("adds the [Davis Motomiya] and [Free] cards from the reveal to hand, trashes the rest", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const davisNamed = instance("BT3-093", 0, false);
    const freeTraited = instance("BT17-077", 0, false);
    const filler = instance("AD1-001", 0, false);
    p0.deck.push(davisNamed, freeTraited, filler);

    playCard(s);
    expect(s.state.memory).toBe(-3);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-094"));
    await settle(() => false, 60);

    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === davisNamed.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === freeTraited.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === filler.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === filler.instanceId)).toBe(false);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-094")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT21-094")).toBe(false);
  });

  it("does not treat a non-Armor hand card as a valid Delay destination", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT21-035", as: "armor", under: ["BT21-032"] }],
          security: ["BT1-001", "BT1-002"],
          hand: [
            { card: "BT21-094", as: "option" },
            { card: "BT1-009", as: "nonArmor" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-014", "BT1-015", "BT1-016"],
        },
        1: {
          battleArea: [{ card: "BT10-055", as: "stronger", suspended: true }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-094"));

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("stronger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stronger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-035"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonArmor").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-094")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-032")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});

describe("BT21-094 Delay watcher", () => {
  it("keeps the Armor Form trash watcher separate from its Delay payload", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(1);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigimonTopTrashed",
      sourceFilter: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
    });
    expect(allTurns[0]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    const watcher = allTurns[0]?.actions[0];
    if (watcher?.kind !== "SubTrigger") throw new Error("expected reactive Delay watcher");
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("Security activates the full Main reveal and places the option", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: {
          security: [{ card: "BT21-094", as: "option" }],
          deck: [
            { card: "BT3-093", as: "davis" },
            { card: "BT17-077", as: "free" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-094") &&
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("davis").instanceId, s.inst("free").instanceId]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("rest").instanceId)).toBe(true);
  });

  it("proves public Armor Purge trashes the Armor Form top card", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT21-035", as: "armor", under: ["BT21-032"] },
            { card: "BT21-035", as: "armor2", under: ["BT21-032"] },
            { card: "BT21-032", as: "base" },
          ],
          hand: [
            { card: "BT21-094", as: "option" },
            { card: "BT21-036", as: "freeArmor" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "stronger", suspended: true },
            { card: "BT10-055", as: "stronger2", suspended: true },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-094"));
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stronger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-035"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-035")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-094")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-036")).toBe(false);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("stronger2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("stronger2").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armor2").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stronger2").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-036"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-036")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
